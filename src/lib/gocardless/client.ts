import type {
  GoCardlessAgreement,
  GoCardlessInstitution,
  GoCardlessRequisition,
  GoCardlessTokenResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

function getBaseUrl(): string {
  return (process.env.GOCARDLESS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getSecrets(): { secretId: string; secretKey: string } {
  const secretId = process.env.GOCARDLESS_CLIENT_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_CLIENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error('error.gocardless.notConfigured');
  }

  return { secretId, secretKey };
}

/**
 * Exchanges the configured secret id/key for a short-lived access token.
 * A fresh token is fetched per operation; no refresh token is persisted.
 */
async function getAccessToken(): Promise<string> {
  const { secretId, secretKey } = getSecrets();

  const response = await fetch(`${getBaseUrl()}/token/new/`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('GoCardless token error', response.status, await safeText(response));
    throw new Error('error.gocardless.tokenFailed');
  }

  const data = (await response.json()) as GoCardlessTokenResponse;
  return data.access;
}

async function authedFetch(path: string, init: RequestInit & { token: string }): Promise<Response> {
  const { token, ...rest } = init;
  return fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
  });
}

/** Lists the available financial institutions for a two-letter country code. */
export async function listInstitutions(country: string): Promise<GoCardlessInstitution[]> {
  const token = await getAccessToken();

  const response = await authedFetch(`/institutions/?country=${encodeURIComponent(country.toLowerCase())}`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    console.error('GoCardless institutions error', response.status, await safeText(response));
    throw new Error('error.gocardless.institutionsFailed');
  }

  return (await response.json()) as GoCardlessInstitution[];
}

/** Fetches a single institution by id. */
export async function getInstitution(institutionId: string): Promise<GoCardlessInstitution> {
  const token = await getAccessToken();

  const response = await authedFetch(`/institutions/${encodeURIComponent(institutionId)}/`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    console.error('GoCardless institution error', response.status, await safeText(response));
    throw new Error('error.gocardless.institutionsFailed');
  }

  return (await response.json()) as GoCardlessInstitution;
}

/** Creates a requisition (the link the end user follows to authenticate at their bank). */
export async function createRequisition(params: {
  institutionId: string;
  reference: string;
  redirect: string;
  userLanguage?: string;
}): Promise<GoCardlessRequisition> {
  const token = await getAccessToken();

  const response = await authedFetch('/requisitions/', {
    method: 'POST',
    token,
    body: JSON.stringify({
      institution_id: params.institutionId,
      reference: params.reference,
      redirect: params.redirect,
      ...(params.userLanguage ? { user_language: params.userLanguage.toUpperCase() } : {}),
    }),
  });

  if (!response.ok) {
    console.error('GoCardless requisition error', response.status, await safeText(response));
    throw new Error('error.gocardless.requisitionFailed');
  }

  return (await response.json()) as GoCardlessRequisition;
}

/** Retrieves a requisition, including its status and linked account ids. */
export async function getRequisition(requisitionId: string): Promise<GoCardlessRequisition> {
  const token = await getAccessToken();

  const response = await authedFetch(`/requisitions/${encodeURIComponent(requisitionId)}/`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    console.error('GoCardless get requisition error', response.status, await safeText(response));
    throw new Error('error.gocardless.requisitionFailed');
  }

  return (await response.json()) as GoCardlessRequisition;
}

/** Retrieves an end user agreement (access window, acceptance timestamp). */
export async function getAgreement(agreementId: string): Promise<GoCardlessAgreement> {
  const token = await getAccessToken();

  const response = await authedFetch(`/agreements/enduser/${encodeURIComponent(agreementId)}/`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    console.error('GoCardless agreement error', response.status, await safeText(response));
    throw new Error('error.gocardless.requisitionFailed');
  }

  return (await response.json()) as GoCardlessAgreement;
}

/** Deletes a requisition (used when unlinking a bank connection). */
export async function deleteRequisition(requisitionId: string): Promise<void> {
  const token = await getAccessToken();

  const response = await authedFetch(`/requisitions/${encodeURIComponent(requisitionId)}/`, {
    method: 'DELETE',
    token,
  });

  // 404 means it is already gone on GoCardless side - treat as success.
  if (!response.ok && response.status !== 404) {
    console.error('GoCardless delete requisition error', response.status, await safeText(response));
    throw new Error('error.gocardless.deleteFailed');
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}
