'use server';

import moment from 'moment';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function getConfiguration(projectId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the project
    const project = await db.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        managers: true,
        configuration: true,
        lenders: {
          include: { loans: { include: { transactions: true } } },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this project');
    }

    // Transform the configuration to match the form schema
    const configuration = project.configuration
      ? {
          id: project.configuration.id,
          name: project.configuration.name,
          // Convert nullable fields to undefined for the form
          email: project.configuration.email || undefined,
          telNo: project.configuration.telNo || undefined,
          website: project.configuration.website || undefined,
          street: project.configuration.street || undefined,
          addon: project.configuration.addon || undefined,
          zip: project.configuration.zip || undefined,
          place: project.configuration.place || undefined,
          country: project.configuration.country || undefined,
          iban: project.configuration.iban || undefined,
          bic: project.configuration.bic || undefined,
          userLanguage: project.configuration.userLanguage || undefined,
          userTheme: project.configuration.userTheme || undefined,
          lenderSalutation: project.configuration.lenderSalutation || undefined,
          lenderCountry: project.configuration.lenderCountry || undefined,
          lenderNotificationType: project.configuration.lenderNotificationType || undefined,
          lenderMembershipStatus: project.configuration.lenderMembershipStatus || undefined,
          lenderTags: project.configuration.lenderTags || [],
          interestMethod: project.configuration.interestMethod || undefined,
          altInterestMethods: project.configuration.altInterestMethods || [],
          customLoans: project.configuration.customLoans || false,
          lenderRequiredFields: project.configuration.lenderRequiredFields || [],
          logo: project.configuration.logo || undefined,
        }
      : null;

    return {
      configuration,
      hasHistoricTransactions: project.lenders.some((lender) =>
        lender.loans.some(
          (loan) => loan.transactions.filter((t) => moment(t.date).isBefore(moment().startOf('year'))).length > 0,
        ),
      ),
    };
  } catch (error) {
    console.error('Error fetching project configuration:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch project configuration',
    };
  }
}
