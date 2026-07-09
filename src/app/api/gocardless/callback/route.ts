import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { getAgreement, getRequisition } from '@/lib/gocardless/client';
import { getAppBaseUrl } from '@/lib/templates/system-merge-links';

/**
 * GET /api/gocardless/callback
 *
 * GoCardless redirects the end user here after the bank authentication flow.
 * It appends `?ref=<reference>` (the reference we set when creating the requisition).
 * We look up the matching BankConnection, refresh its status and linked accounts,
 * then send the user back to the configuration page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('ref');

  // Prefer the public app URL (SOLILOAN_URL); behind a reverse proxy the request
  // origin can be the internal host (e.g. http://soliloan:3000), which the browser
  // cannot reach.
  const baseUrl = getAppBaseUrl() || url.origin;

  const configurationUrl = (projectId?: string) => {
    const target = new URL('/configuration', baseUrl);
    target.searchParams.set('tab', 'general');
    if (projectId) {
      target.searchParams.set('projectId', projectId);
    }
    return target;
  };

  if (!reference) {
    return NextResponse.redirect(configurationUrl());
  }

  const connection = await db.bankConnection.findUnique({
    where: { reference },
    select: { id: true, projectId: true, requisitionId: true },
  });

  if (!connection) {
    return NextResponse.redirect(configurationUrl());
  }

  try {
    const requisition = await getRequisition(connection.requisitionId);

    // Once the user accepted the agreement, derive the access expiry date from
    // the agreement (accepted timestamp + access_valid_for_days).
    let accessExpiresAt: Date | null = null;
    if (requisition.agreement) {
      try {
        const agreement = await getAgreement(requisition.agreement);
        if (agreement.accepted) {
          const accepted = new Date(agreement.accepted);
          if (!Number.isNaN(accepted.getTime())) {
            accessExpiresAt = new Date(accepted.getTime() + agreement.access_valid_for_days * 24 * 60 * 60 * 1000);
          }
        }
      } catch (agreementError) {
        console.error('Failed to load GoCardless agreement', agreementError);
      }
    }

    await db.bankConnection.update({
      where: { id: connection.id },
      data: {
        status: requisition.status,
        accountIds: requisition.accounts ?? [],
        agreementId: requisition.agreement ?? null,
        accessExpiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to finalize GoCardless requisition', error);
  }

  return NextResponse.redirect(configurationUrl(connection.projectId));
}
