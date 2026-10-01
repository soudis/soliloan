import { render } from '@react-email/render';
import nodemailer, { type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import React from 'react';
import { db } from '@/lib/db';
import { absoluteAppUrl } from '@/lib/help/forum-urls';
import { renderSystemEmailTemplate, resolveSystemTemplate } from '@/lib/templates/resolve-system-template';
import { getDefaultSystemLinkMergeData } from '@/lib/templates/system-merge-links';
import { getTemplateData } from '@/lib/templates/template-data';
import { resolveTemplateSubject } from '@/lib/templates/template-subject-filename';

export const EMAIL_SEND_FAILED = 'error.email.sendFailed';

function getSmtpTransportOptions(): SMTPTransport.Options {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = process.env.SMTP_SECURE;

  // Port 465 uses implicit TLS (SMTPS). Port 587 uses plain connect + STARTTLS upgrade.
  // Mismatching port and `secure` causes OpenSSL "wrong version number" on connect.
  let secure: boolean;
  if (secureEnv === 'true') {
    secure = true;
  } else if (secureEnv === 'false') {
    secure = false;
  } else {
    secure = port === 465;
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD ?? '';

  return {
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: port === 587 && !secure,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    ...(user ? { auth: { user, pass } } : {}),
  };
}

function smtpErrorDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; command?: string; response?: string };
    return { message: e.message, code: e.code, command: e.command, response: e.response };
  }
  return { message: String(error) };
}

function isEmailSendError(error: unknown): boolean {
  return error instanceof Error && error.message === EMAIL_SEND_FAILED;
}

async function sendMailOnce(mail: SendMailOptions) {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is not set');
  }

  const transporter = nodemailer.createTransport(getSmtpTransportOptions());
  try {
    return await transporter.sendMail(mail);
  } finally {
    transporter.close();
  }
}

async function dispatchMail(mail: SendMailOptions) {
  const payload: SendMailOptions = {
    from: process.env.SMTP_FROM,
    ...mail,
  };

  try {
    try {
      return await sendMailOnce(payload);
    } catch (firstError) {
      console.error('SMTP send failed, retrying once', smtpErrorDetails(firstError));
      return await sendMailOnce(payload);
    }
  } catch (error) {
    console.error('SMTP send failed', smtpErrorDetails(error));
    throw new Error(EMAIL_SEND_FAILED);
  }
}

/**
 * Send an email using nodemailer with a React email component.
 */
export async function sendEmail(to: string, subject: string, html: React.ReactElement) {
  const htmlContent = render(html);

  return dispatchMail({
    to,
    subject,
    html: await htmlContent,
  });
}

/**
 * Send an email using nodemailer with a pre-rendered HTML string.
 */
export async function sendRawEmail(
  to: string,
  subject: string,
  html: string,
  extras?: Pick<SendMailOptions, 'headers' | 'list'>,
) {
  return dispatchMail({
    to,
    subject,
    html,
    ...extras,
  });
}

async function sendLegacyPasswordInvitationEmail(
  to: string,
  name: string,
  resetUrl: string,
  locale: string,
  projectName: string,
) {
  const { PasswordInvitationEmail } = await import('@/emails/password-invitation-email');

  return sendEmail(
    to,
    'Danke für deinen Direktkredit',
    React.createElement(PasswordInvitationEmail, {
      name,
      resetUrl,
      locale,
      projectName,
    }),
  );
}

function buildSystemUrls(token: string, locale = 'de') {
  const inviteUrl = absoluteAppUrl(`/auth/set-password?token=${encodeURIComponent(token)}`, locale);

  return {
    ...getDefaultSystemLinkMergeData(),
    passwordReset: inviteUrl,
    emailVerification: inviteUrl,
    invitation: inviteUrl,
    login: absoluteAppUrl('/auth/login', locale),
  };
}

export async function renderSystemTemplateEmailContent(args: {
  systemKey: string;
  projectId?: string | null;
  templateRecordId?: string | null;
  additionalMergeData?: Record<string, unknown>;
  fallbackSubject: string;
}): Promise<{ html: string; subject: string } | null> {
  const template = await resolveSystemTemplate(args.systemKey, args.projectId);
  if (!template) return null;

  const templateDataOptions =
    template.dataset === 'LENDER_YEARLY'
      ? (() => {
          const y = args.additionalMergeData?.year;
          if (typeof y === 'number' && Number.isFinite(y)) return { year: y };
          if (typeof y === 'string' && /^\d{4}$/.test(y)) return { year: Number.parseInt(y, 10) };
          return { year: new Date().getFullYear() - 1 };
        })()
      : undefined;

  const templateData = await getTemplateData(
    template.dataset,
    args.templateRecordId,
    'de',
    args.projectId ?? undefined,
    templateDataOptions,
  );
  if (!templateData) return null;

  const mergeData: Record<string, unknown> = {
    ...templateData,
    ...(args.additionalMergeData ?? {}),
  };

  let logoUrl: string | null = null;
  const configLogo = (mergeData.config as { logo?: unknown } | undefined)?.logo;
  if (typeof configLogo === 'string' && configLogo.length > 0) {
    logoUrl = configLogo;
  } else if (args.projectId) {
    const project = await db.project.findUnique({
      where: { id: args.projectId },
      select: {
        configuration: {
          select: { logo: true },
        },
      },
    });
    logoUrl = project?.configuration?.logo ?? null;
  }

  const html = renderSystemEmailTemplate(template.designJson, mergeData, { logoUrl });
  if (!html) return null;

  const subject = resolveTemplateSubject(template.subjectOrFilename, mergeData, args.fallbackSubject);
  return { html, subject };
}

async function sendSystemTemplateEmail({
  systemKey,
  projectId,
  templateRecordId,
  additionalMergeData,
  to,
  subject,
}: {
  systemKey: string;
  projectId?: string | null;
  templateRecordId?: string | null;
  additionalMergeData?: Record<string, unknown>;
  to: string;
  subject: string;
}) {
  const content = await renderSystemTemplateEmailContent({
    systemKey,
    projectId,
    templateRecordId,
    additionalMergeData,
    fallbackSubject: subject,
  });
  if (!content) return false;

  await sendRawEmail(to, content.subject, content.html);
  return true;
}

export function getLenderEmailFromTemplateMergeData(mergeData: Record<string, unknown>): string | null {
  const lender = mergeData.lender as { email?: unknown } | undefined;
  if (!lender || typeof lender.email !== 'string') {
    return null;
  }
  const trimmed = lender.email.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Render subject + HTML for a communication template without sending. */
export function buildCommunicationTemplateEmailContent(args: {
  designJson: unknown;
  subjectOrFilename: string | null;
  mergeData: Record<string, unknown>;
  fallbackSubject: string;
  logoUrl: string | null;
}): { html: string; subject: string } | null {
  const html = renderSystemEmailTemplate(args.designJson, args.mergeData, { logoUrl: args.logoUrl });
  if (!html) return null;
  const subject = resolveTemplateSubject(args.subjectOrFilename, args.mergeData, args.fallbackSubject);
  return { html, subject };
}

/** Render a stored communication template (design JSON) and send to one recipient. */
export async function renderAndSendCommunicationTemplateEmail(args: {
  designJson: unknown;
  subjectOrFilename: string | null;
  mergeData: Record<string, unknown>;
  to: string;
  fallbackSubject: string;
  logoUrl: string | null;
}): Promise<boolean> {
  const built = buildCommunicationTemplateEmailContent({
    designJson: args.designJson,
    subjectOrFilename: args.subjectOrFilename,
    mergeData: args.mergeData,
    fallbackSubject: args.fallbackSubject,
    logoUrl: args.logoUrl,
  });
  if (!built) return false;
  await sendRawEmail(args.to, built.subject, built.html);
  return true;
}

export interface LenderInviteContext {
  lenderId: string;
  lenderName: string;
  lenderEmail: string;
  projectId: string;
  projectName: string;
  configData: Record<string, unknown>;
}

export interface ProjectManagerInviteContext {
  projectId: string;
  projectName: string;
  projectSlug: string;
  configData: Record<string, unknown>;
}

/**
 * Send a lender invitation email using the `lender-invite-email` system template
 * if one exists (project-level preferred, global fallback). Falls back to the
 * legacy React email component when no template is configured.
 */
export async function sendPasswordInvitationEmail(
  to: string,
  name: string,
  token: string,
  locale: string,
  projectName: string,
  lenderContext?: LenderInviteContext,
) {
  const systemUrls = buildSystemUrls(token, locale);
  const resetUrl = systemUrls.passwordReset;

  // Try system template path when project context is available
  if (lenderContext) {
    try {
      const sent = await sendSystemTemplateEmail({
        systemKey: 'lender-invite-email',
        projectId: lenderContext.projectId,
        templateRecordId: lenderContext.lenderId,
        additionalMergeData: {
          system: systemUrls,
        },
        to,
        subject: 'Danke für deinen Direktkredit',
      });
      if (sent) {
        return;
      }
    } catch (err) {
      if (isEmailSendError(err)) throw err;
      console.error('Failed to render system invite template, falling back to legacy', err);
    }
  }

  return sendLegacyPasswordInvitationEmail(to, name, resetUrl, locale, projectName);
}

export async function sendProjectManagerInvitationEmail(
  to: string,
  name: string,
  token: string,
  locale: string,
  managerContext: ProjectManagerInviteContext,
) {
  const systemUrls = buildSystemUrls(token, locale);

  try {
    const sent = await sendSystemTemplateEmail({
      systemKey: 'manager-invite-email',
      projectId: managerContext.projectId,
      templateRecordId: managerContext.projectId,
      additionalMergeData: {
        system: systemUrls,
      },
      to,
      subject: 'Einladung als Projektmanager',
    });
    if (sent) {
      return;
    }
  } catch (err) {
    if (isEmailSendError(err)) throw err;
    console.error('Failed to render manager invite template, falling back to legacy', err);
  }

  return sendLegacyPasswordInvitationEmail(to, name, systemUrls.passwordReset, locale, managerContext.projectName);
}

/**
 * Send a password reset email
 * @param to Recipient email address
 * @param name Recipient name
 * @param token Password reset token
 * @param locale User's preferred language (defaults to 'de')
 * @returns Promise with the result of the email sending
 */
/**
 * Notify the lender about a newly booked transaction (manager opt-in).
 * Uses system template `transaction-notification-email` (project override if present).
 */
const TRANSACTION_NOTIFICATION_SUBJECT = 'Neue Zahlung';

export async function renderTransactionNotificationEmail(args: {
  transactionId: string;
  projectId: string;
}): Promise<{ html: string; subject: string } | null> {
  return renderSystemTemplateEmailContent({
    systemKey: 'transaction-notification-email',
    projectId: args.projectId,
    templateRecordId: args.transactionId,
    fallbackSubject: TRANSACTION_NOTIFICATION_SUBJECT,
  });
}

export async function sendTransactionNotificationToLender(args: {
  to: string;
  transactionId: string;
  projectId: string;
}) {
  try {
    return await sendSystemTemplateEmail({
      systemKey: 'transaction-notification-email',
      projectId: args.projectId,
      templateRecordId: args.transactionId,
      to: args.to,
      subject: TRANSACTION_NOTIFICATION_SUBJECT,
    });
  } catch (err) {
    if (isEmailSendError(err)) throw err;
    console.error('Failed to send transaction notification email', err);
    return false;
  }
}

/** Sends the transaction notification and records when the lender was informed. */
export async function notifyLenderAboutTransaction(args: {
  to: string | null | undefined;
  transactionId: string;
  projectId: string;
}): Promise<'sent' | 'skipped' | 'failed'> {
  const email = args.to?.trim();
  if (!email) return 'skipped';

  const sent = await sendTransactionNotificationToLender({
    to: email,
    transactionId: args.transactionId,
    projectId: args.projectId,
  });
  if (!sent) return 'failed';

  await db.transaction.update({
    where: { id: args.transactionId },
    data: { lenderNotifiedAt: new Date() },
  });
  return 'sent';
}

export async function sendPasswordResetEmail(to: string, name: string, token: string, userId: string, locale = 'de') {
  const systemUrls = buildSystemUrls(token, locale);
  const resetUrl = systemUrls.passwordReset;

  try {
    const sent = await sendSystemTemplateEmail({
      systemKey: 'password-reset-email',
      projectId: null,
      templateRecordId: userId,
      additionalMergeData: {
        system: systemUrls,
      },
      to,
      subject: 'Passwort zurücksetzen',
    });
    if (sent) {
      return;
    }
  } catch (err) {
    if (isEmailSendError(err)) throw err;
    console.error('Failed to send password reset via system template, falling back to legacy', err);
  }

  // Import the email template dynamically to avoid SSR issues
  const { PasswordResetEmail } = await import('@/emails/password-reset-email');

  return sendEmail(to, 'Passwort zurücksetzen', React.createElement(PasswordResetEmail, { name, resetUrl, locale }));
}
