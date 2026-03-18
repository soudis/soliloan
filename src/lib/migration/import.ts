import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { PrismaClient } from '@prisma/client';
import { InterestMethod } from '@prisma/client';
import AdmZip from 'adm-zip';

import {
  emptyToNull,
  ensureUniqueSlug,
  mapContractStatus,
  mapCountry,
  mapInterestMethod,
  mapLenderNames,
  mapLenderType,
  mapMembershipStatus,
  mapPaymentType,
  mapSalutation,
  mapTerminationPeriodType,
  mapTerminationType,
  mapTransactionType,
} from './mapping';
import type {
  Dkpv1DataPackage,
  Dkpv1ProjectInfo,
  MigrationIdMapping,
  MigrationReport,
  MigrationWarning,
} from './types';

const SIGN_DATE_FALLBACK = new Date('2000-01-01');

interface MigrationInput {
  baseUrl: string;
  accessToken: string;
  currentUserId: string;
}

async function downloadToFile(baseUrl: string, accessToken: string, destPath: string): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/migrate`;
  const response = await fetch(url, {
    headers: { 'X-Migration-Token': accessToken },
  });

  if (!response.ok) {
    throw new Error('error.migration.fetchFailed');
  }

  if (!response.body) {
    throw new Error('error.migration.fetchFailed');
  }

  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  await pipeline(nodeStream, createWriteStream(destPath));
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

async function loadLogoFromPackage(tempDir: string, logoPath: string | undefined): Promise<string | null> {
  if (!logoPath) return null;

  const relativePath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
  const fullPath = join(tempDir, relativePath);

  let fileData: Buffer;
  try {
    fileData = await readFile(fullPath);
  } catch {
    return null;
  }

  const ext = extname(relativePath).toLowerCase();
  const mimeType = EXTENSION_MIME_MAP[ext] ?? 'image/png';
  return `data:${mimeType};base64,${fileData.toString('base64')}`;
}

function getUserName(user: { id: number; first_name?: string | null; last_name?: string | null }): string {
  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  return [firstName, lastName].filter((part) => part.length > 0).join(' ') || `user-${user.id}`;
}

export async function fetchAndExtractDataPackage(
  baseUrl: string,
  accessToken: string,
): Promise<{ tempDir: string; data: Dkpv1DataPackage; projectInfo: Dkpv1ProjectInfo }> {
  const tempDir = join(tmpdir(), `soliloan-migration-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const zipPath = join(tempDir, 'data-package.zip');

  await downloadToFile(baseUrl, accessToken, zipPath);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tempDir, true);

  const dbPath = join(tempDir, 'database.json');
  let dbContent: string;
  try {
    dbContent = await readFile(dbPath, 'utf-8');
  } catch {
    throw new Error('error.migration.noDatabaseJson');
  }

  const data = JSON.parse(dbContent) as Dkpv1DataPackage;
  if (!data.user || !data.contract || !data.transaction) {
    throw new Error('error.migration.invalidDataPackage');
  }

  const projectPath = join(tempDir, 'project.json');
  let projectContent: string;
  try {
    projectContent = await readFile(projectPath, 'utf-8');
  } catch {
    throw new Error('error.migration.noProjectJson');
  }

  const projectInfo = JSON.parse(projectContent) as Dkpv1ProjectInfo;
  if (!projectInfo.projectid || projectInfo.projectid.trim() === '') {
    throw new Error('error.migration.noProjectId');
  }

  return { tempDir, data, projectInfo };
}

export async function runMigration(db: PrismaClient, input: MigrationInput): Promise<MigrationReport> {
  const warnings: MigrationWarning[] = [];
  const idMappings: MigrationIdMapping[] = [];
  let skippedFiles = 0;

  const { tempDir, data, projectInfo } = await fetchAndExtractDataPackage(input.baseUrl, input.accessToken);

  try {
    const projectCount = await db.project.count();
    const numberOffset = projectCount * 10000;

    const logo = await loadLogoFromPackage(tempDir, projectInfo.logo_select ?? projectInfo.logo);

    const result = await db.$transaction(
      // biome-ignore lint/suspicious/noExplicitAny: Prisma interactive transaction callback type
      async (tx: any) => {
        // 1. Create Project + Configuration
        const slug = await ensureUniqueSlug(projectInfo.projectid, tx);
        const defaults = projectInfo.defaults;

        const interestMethod =
          mapInterestMethod(defaults?.interest_method ?? null, warnings, 0) ?? InterestMethod.ACT_360_COMPOUND;

        const altInterestMethods = (defaults?.interest_methods_alternative ?? [])
          .filter((m): m is string => m !== null && m !== undefined)
          .map((m) => mapInterestMethod(m, warnings, 0))
          .filter((m): m is InterestMethod => m !== null);

        const lenderAdditionalFields = [
          {
            id: 'membership_status',
            name: 'Mitgliedsstatus',
            type: 'select',
            selectOptions: ['Nicht definiert', 'Mitglied', 'Extern'],
            required: false,
          },
          {
            id: 'relationship',
            name: 'Beziehung zum Projekt',
            type: 'select',
            selectOptions: defaults?.relationships ?? ([] as string[]),
            required: false,
          },
        ];

        const project = await tx.project.create({
          data: {
            slug,
            configuration: {
              create: {
                name: projectInfo.projectname,
                logo,
                website: emptyToNull(projectInfo.url),
                email: emptyToNull(projectInfo.email),
                iban: emptyToNull(projectInfo.project_iban),
                bic: emptyToNull(projectInfo.project_bic),
                country: mapCountry(defaults?.country ?? null, warnings, 0),
                interestMethod,
                altInterestMethods,
                lenderAdditionalFields,
              },
            },
            managers: {
              connect: { id: input.currentUserId },
            },
          },
        });

        // 2. Admins -> User upsert + ProjectManager
        let adminCount = 0;
        const admins = data.admin ?? [];
        for (const admin of admins) {
          if (!admin.email) {
            warnings.push({ entity: 'admin', legacyId: admin.id, message: 'Keine E-Mail -> Admin übersprungen' });
            continue;
          }

          const existingUser = await tx.user.findUnique({ where: { email: admin.email } });

          if (existingUser) {
            await tx.project.update({
              where: { id: project.id },
              data: { managers: { connect: { id: existingUser.id } } },
            });
          } else {
            const newUser = await tx.user.create({
              data: {
                name: admin.logon_id,
                email: admin.email,
                password: admin.passwordHashed,
                language: 'de',
                theme: 'default',
              },
            });
            await tx.project.update({
              where: { id: project.id },
              data: { managers: { connect: { id: newUser.id } } },
            });
          }

          adminCount++;
        }

        // 3. Users -> User upsert + Lender (with email linking)
        const userToLenderMap = new Map<number, string>();
        let lenderCount = 0;

        for (const user of data.user) {
          const userEmail = emptyToNull(user.email);
          let emailLinked = false;

          if (userEmail) {
            const existingUser = await tx.user.findUnique({ where: { email: userEmail } });
            if (!existingUser) {
              await tx.user.create({
                data: {
                  name: getUserName(user),
                  email: userEmail,
                  password: user.passwordHashed,
                  language: 'de',
                  theme: 'default',
                },
              });
            }
            emailLinked = true;
          }

          const additionalFields: Record<string, string> = {
            membership_status: mapMembershipStatus(user.membership_status),
            relationship: user.relationship ?? '',
          };

          const lenderType = mapLenderType(user.type, warnings, user.id);
          const { firstName, lastName, organisationName } = mapLenderNames(lenderType, user);

          const lender = await tx.lender.create({
            data: {
              lenderNumber: numberOffset + user.id,
              projectId: project.id,
              type: lenderType,
              salutation: mapSalutation(user.salutation, warnings, user.id),
              firstName,
              lastName,
              organisationName,
              titlePrefix: emptyToNull(user.title_prefix),
              titleSuffix: emptyToNull(user.title_suffix),
              street: emptyToNull(user.street),
              zip: emptyToNull(user.zip),
              place: emptyToNull(user.place),
              country: mapCountry(user.country, warnings, user.id),
              telNo: user.telno ?? null,
              email: emailLinked ? userEmail : null,
              iban: emptyToNull(user.IBAN),
              bic: emptyToNull(user.BIC),
              additionalFields,
            },
          });

          userToLenderMap.set(user.id, lender.id);
          idMappings.push({
            entity: 'lender',
            legacyId: user.id,
            newId: lender.id,
            displayNumber: numberOffset + user.id,
          });
          lenderCount++;
        }

        // 4. User-Notes
        let noteCount = 0;
        for (const user of data.user) {
          if (!user.notes || user.notes.trim() === '') continue;
          const lenderId = userToLenderMap.get(user.id);
          if (!lenderId) continue;

          await tx.note.create({
            data: {
              text: user.notes,
              public: user.notes_public === 1,
              lenderId,
              createdById: input.currentUserId,
              createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            },
          });
          noteCount++;
        }

        // 5. Contracts -> Loan + ID-Map
        const contractToLoanMap = new Map<number, string>();
        const contractToUserIdMap = new Map<number, number>();
        let loanCount = 0;

        for (const contract of data.contract) {
          const lenderId = userToLenderMap.get(contract.user_id);
          if (!lenderId) {
            throw new Error(
              `Migration abgebrochen: Contract #${contract.id} referenziert User #${contract.user_id}, der nicht im Datenpaket existiert.`,
            );
          }

          let signDate: Date;
          if (!contract.sign_date) {
            warnings.push({
              entity: 'contract',
              legacyId: contract.id,
              message: 'sign_date fehlt, Fallback auf 2000-01-01',
            });
            signDate = SIGN_DATE_FALLBACK;
          } else {
            signDate = new Date(contract.sign_date);
          }

          const terminationType = mapTerminationType(contract.termination_type);
          let endDate: Date | null = null;
          let terminationDate: Date | null = null;

          if (contract.termination_date) {
            if (terminationType === 'ENDDATE') {
              endDate = new Date(contract.termination_date);
            } else {
              terminationDate = new Date(contract.termination_date);
            }
          }

          const interestRate = contract.interest_rate;

          const loan = await tx.loan.create({
            data: {
              loanNumber: numberOffset + contract.id,
              lenderId,
              signDate,
              terminationType,
              endDate,
              terminationDate,
              terminationPeriod: contract.termination_period ? Math.round(contract.termination_period) : null,
              terminationPeriodType: mapTerminationPeriodType(contract.termination_period_type, warnings, contract.id),
              amount: contract.amount,
              interestRate,
              altInterestMethod: mapInterestMethod(contract.interest_method, warnings, contract.id),
              contractStatus: mapContractStatus(contract.status),
            },
          });

          contractToLoanMap.set(contract.id, loan.id);
          contractToUserIdMap.set(contract.id, contract.user_id);
          idMappings.push({
            entity: 'loan',
            legacyId: contract.id,
            newId: loan.id,
            displayNumber: numberOffset + contract.id,
          });
          loanCount++;
        }

        // 6. Contract-Notes
        for (const contract of data.contract) {
          if (!contract.notes || contract.notes.trim() === '') continue;
          const loanId = contractToLoanMap.get(contract.id);
          const userId = contractToUserIdMap.get(contract.id);
          const lenderId = userId ? userToLenderMap.get(userId) : undefined;
          if (!loanId || !lenderId) continue;

          await tx.note.create({
            data: {
              text: contract.notes,
              public: contract.notes_public === 1,
              lenderId,
              loanId,
              createdById: input.currentUserId,
              createdAt: contract.createdAt ? new Date(contract.createdAt) : new Date(),
            },
          });
          noteCount++;
        }

        // 7. Transactions
        let transactionCount = 0;
        for (const txn of data.transaction) {
          const loanId = contractToLoanMap.get(txn.contract_id);
          if (!loanId) {
            throw new Error(
              `Migration abgebrochen: Transaction #${txn.id} referenziert Contract #${txn.contract_id}, der nicht im Datenpaket existiert.`,
            );
          }

          if (txn.transaction_date === null || txn.transaction_date === undefined) {
            throw new Error(`Migration abgebrochen: Transaction #${txn.id} hat kein transaction_date.`);
          }
          if (txn.amount === null || txn.amount === undefined) {
            throw new Error(`Migration abgebrochen: Transaction #${txn.id} hat keinen amount.`);
          }

          await tx.transaction.create({
            data: {
              loanId,
              type: mapTransactionType(txn.type),
              date: new Date(txn.transaction_date),
              amount: txn.amount,
              paymentType: mapPaymentType(txn.payment_type),
            },
          });
          transactionCount++;
        }

        // 8. Files (ref_table='user' only)
        let fileCount = 0;
        const files = data.file ?? [];
        for (const file of files) {
          if (file.ref_table !== 'user') {
            skippedFiles++;
            continue;
          }

          if (file.ref_id === null || file.ref_id === undefined) {
            skippedFiles++;
            continue;
          }

          const lenderId = userToLenderMap.get(file.ref_id);
          if (!lenderId) {
            warnings.push({
              entity: 'file',
              legacyId: file.id,
              message: `ref_id ${file.ref_id} zeigt auf unbekannten User -> übersprungen`,
            });
            skippedFiles++;
            continue;
          }

          const filePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
          const fullPath = join(tempDir, filePath);
          let fileData: Buffer;
          try {
            fileData = await readFile(fullPath);
          } catch {
            warnings.push({
              entity: 'file',
              legacyId: file.id,
              message: `Datei "${filePath}" nicht im Datenpaket gefunden -> übersprungen`,
            });
            skippedFiles++;
            continue;
          }

          await tx.file.create({
            data: {
              name: file.filename,
              mimeType: file.mime,
              data: fileData,
              public: file.public === 1,
              description: emptyToNull(file.description),
              lenderId,
              createdById: input.currentUserId,
            },
          });
          fileCount++;
        }

        return {
          projectId: project.id,
          projectSlug: slug,
          counts: {
            admins: adminCount,
            lenders: lenderCount,
            loans: loanCount,
            transactions: transactionCount,
            files: fileCount,
            notes: noteCount,
          },
        };
      },
      { timeout: 120_000 },
    );

    return {
      success: true,
      projectId: result.projectId,
      projectSlug: result.projectSlug,
      counts: result.counts,
      warnings,
      idMappings,
      skippedFiles,
      unmappedFields: ['user.account_notification_type', 'user.lastLogin / user.loginCount'],
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
