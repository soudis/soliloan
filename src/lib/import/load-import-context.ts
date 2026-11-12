import 'server-only';

import moment from 'moment';

import { db } from '@/lib/db';
import { normalizeStoredEmail } from '@/lib/utils/email';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';

import type { ImportContext } from './types';
import { lenderNameKey } from './validate';

const localIsoDate = (date: Date) => moment(date).format('YYYY-MM-DD');

/** Loads what validation needs to know about a project. The caller must have checked access to the project. */
export async function loadImportContextUnsafe(projectId: string): Promise<ImportContext> {
  const [project, lenders, loans, investmentTypes, historic] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { configuration: { include: { loanTemplates: true } } },
    }),
    db.lender.findMany({
      where: { projectId },
      select: {
        lenderNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        organisationName: true,
        street: true,
        zip: true,
      },
    }),
    db.loan.findMany({ where: { lender: { projectId } }, select: { loanNumber: true } }),
    db.investmentType.findMany({ where: { projectId }, select: { interestRate: true } }),
    db.transaction.findFirst({
      where: { date: { lt: moment().startOf('year').toDate() }, loan: { lender: { projectId } } },
      select: { id: true },
    }),
  ]);
  if (!project) throw new Error('error.project.notFound');
  const { configuration } = project;

  return {
    interestMethod: configuration.interestMethod,
    altInterestMethods: configuration.altInterestMethods,
    lenderSalutation: configuration.lenderSalutation,
    lenderCountry: configuration.lenderCountry,
    lenderRequiredFields: configuration.lenderRequiredFields,
    deInvestmentActCompliance: configuration.deInvestmentActCompliance,
    lenderAdditionalFields: parseAdditionalFieldConfig(configuration.lenderAdditionalFields) ?? [],
    loanAdditionalFields: parseAdditionalFieldConfig(configuration.loanAdditionalFields) ?? [],
    loanTemplates: configuration.loanTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      terminationType: template.terminationType,
      terminationPeriod: template.terminationPeriod,
      terminationPeriodType: template.terminationPeriodType,
      duration: template.duration,
      durationType: template.durationType,
      endDate: template.endDate ? localIsoDate(template.endDate) : null,
    })),
    defaultLoanTemplateId:
      configuration.defaultLoanTemplateId ??
      configuration.loanTemplates.find((template) => template.isDefault)?.id ??
      null,
    existingLenderNumbers: lenders.map((lender) => lender.lenderNumber),
    existingLoanNumbers: loans.map((loan) => loan.loanNumber),
    existingLenderEmails: lenders.flatMap((lender) => (lender.email ? [normalizeStoredEmail(lender.email)] : [])),
    existingLenderNameKeys: lenders.flatMap((lender) => {
      const key = lenderNameKey(lender);
      return key ? [key] : [];
    }),
    investmentTypeRates: investmentTypes.map((type) => type.interestRate),
    hasHistoricTransactions: Boolean(historic),
    today: localIsoDate(new Date()),
  };
}
