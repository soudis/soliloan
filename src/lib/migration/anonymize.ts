import { Faker, base, de, en } from '@faker-js/faker';

import { normalizeStoredEmail } from '@/lib/utils/email';

import type { Dkpv1Admin, Dkpv1Contract, Dkpv1DataPackage, Dkpv1File, Dkpv1User } from './types';

const TITLE_PREFIXES = ['Dr.', 'Prof.'];
const TITLE_SUFFIXES = ['M.A.', 'B.Sc.'];
const FORMAL_TITLE_PREFIX_CHANCE = 40;
const FORMAL_TITLE_SUFFIX_CHANCE = 30;

export interface AnonymizationResult {
  data: Dkpv1DataPackage;
  preservedUserLegacyIds: Set<number>;
}

export interface AnonymizationOptions {
  currentUserEmail: string | null | undefined;
  environment: string;
}

function createSeededFaker(legacyId: number): Faker {
  const faker = new Faker({ locale: [de, en, base] });
  faker.seed(legacyId);
  return faker;
}

function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeStoredEmail(a) === normalizeStoredEmail(b);
}

function buildImportEmailDomain(environment: string): string {
  const env = environment.trim().toLowerCase() || 'dev';
  return `${env}.import.local`;
}

function buildAnonymizedEmail(faker: Faker, domain: string): string {
  const localPart = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return normalizeStoredEmail(`${localPart}@${domain}`);
}

function shiftLastLogin(original: string | null, faker: Faker): string | null {
  if (!original) return null;

  const date = new Date(original);
  if (Number.isNaN(date.getTime())) return null;

  const offsetDays = faker.number.int({ min: -5, max: 5 });
  date.setDate(date.getDate() + offsetDays);

  const now = new Date();
  if (date > now) {
    return now.toISOString();
  }

  return date.toISOString();
}

function anonymizePersonNames(user: Dkpv1User, faker: Faker): void {
  if (user.type?.toLowerCase() === 'organisation') {
    user.first_name = faker.company.name();
    user.last_name = '';
    return;
  }

  user.first_name = faker.person.firstName();
  user.last_name = faker.person.lastName();
}

function isFormalSalutation(salutation: string | null | undefined): boolean {
  return salutation?.toLowerCase() === 'formal';
}

function anonymizeTitles(user: Dkpv1User, faker: Faker): void {
  user.title_prefix = '';
  user.title_suffix = '';

  if (user.type?.toLowerCase() === 'organisation' || !isFormalSalutation(user.salutation)) {
    return;
  }

  if (faker.number.int({ min: 1, max: 100 }) <= FORMAL_TITLE_PREFIX_CHANCE) {
    user.title_prefix = faker.helpers.arrayElement(TITLE_PREFIXES);
  }

  if (faker.number.int({ min: 1, max: 100 }) <= FORMAL_TITLE_SUFFIX_CHANCE) {
    user.title_suffix = faker.helpers.arrayElement(TITLE_SUFFIXES);
  }
}

function anonymizeUser(user: Dkpv1User, emailDomain: string): void {
  const faker = createSeededFaker(user.id);

  anonymizePersonNames(user, faker);
  anonymizeTitles(user, faker);
  user.street = faker.location.streetAddress();
  user.zip = faker.location.zipCode();
  user.place = faker.location.city();
  user.telno = faker.phone.number();
  user.email = buildAnonymizedEmail(faker, emailDomain);
  user.logon_id = faker.internet.username();

  const countryCode = (user.country ?? 'DE').slice(0, 2).toUpperCase();
  user.IBAN = faker.finance.iban({ countryCode });
  user.BIC = faker.finance.bic();

  user.passwordHashed = '';
  user.password = '';
  user.lastLogin = shiftLastLogin(user.lastLogin, faker);

  if (user.notes && user.notes.trim() !== '') {
    user.notes = faker.lorem.paragraphs({ min: 1, max: 2 });
  }
}

function anonymizeAdmin(admin: Dkpv1Admin, emailDomain: string): void {
  const faker = createSeededFaker(admin.id + 1_000_000);

  admin.email = buildAnonymizedEmail(faker, emailDomain);
  admin.logon_id = faker.internet.username();
  admin.passwordHashed = '';
}

function anonymizeContractNotes(contract: Dkpv1Contract, legacyUserId: number): void {
  if (!contract.notes || contract.notes.trim() === '') return;

  const faker = createSeededFaker(contract.id + legacyUserId);
  contract.notes = faker.lorem.paragraphs({ min: 1, max: 2 });
}

function anonymizeFile(file: Dkpv1File, legacyUserId: number): void {
  const faker = createSeededFaker(file.id + legacyUserId);
  const extension = file.filename.includes('.') ? file.filename.slice(file.filename.lastIndexOf('.')) : '';
  file.filename = `${faker.system.fileName()}${extension}`;
  file.description = file.description ? faker.lorem.sentence() : null;
}

export function anonymizeDataPackage(data: Dkpv1DataPackage, options: AnonymizationOptions): AnonymizationResult {
  const emailDomain = buildImportEmailDomain(options.environment);
  const preservedUserLegacyIds = new Set<number>();

  const cloned: Dkpv1DataPackage = structuredClone(data);

  for (const user of cloned.user) {
    if (emailsMatch(user.email, options.currentUserEmail)) {
      preservedUserLegacyIds.add(user.id);
      continue;
    }
    anonymizeUser(user, emailDomain);
  }

  for (const admin of cloned.admin ?? []) {
    if (emailsMatch(admin.email, options.currentUserEmail)) {
      continue;
    }
    anonymizeAdmin(admin, emailDomain);
  }

  for (const contract of cloned.contract) {
    if (preservedUserLegacyIds.has(contract.user_id)) {
      continue;
    }
    anonymizeContractNotes(contract, contract.user_id);
  }

  for (const file of cloned.file ?? []) {
    if (file.ref_table !== 'user' || file.ref_id === null || file.ref_id === undefined) {
      continue;
    }
    if (preservedUserLegacyIds.has(file.ref_id)) {
      continue;
    }
    anonymizeFile(file, file.ref_id);
  }

  return { data: cloned, preservedUserLegacyIds };
}
