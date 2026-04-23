import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import React from 'react';

import { db } from '@/lib/db';
import { renderSystemEmailTemplate, resolveSystemTemplate } from '@/lib/templates/resolve-system-template';
import { getAppBaseUrl, getDefaultSystemLinkMergeData } from '@/lib/templates/system-merge-links';
import { getTemplateData } from '@/lib/templates/template-data';
import { resolveTemplateSubject } from '@/lib/templates/template-subject-filename';

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email using nodemailer with a React email component.
 */
export async function sendEmail(to: string, subject: string, html: React.ReactElement) {
  const htmlContent = render(html);

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: await htmlContent,
  });
}

/**
 * Send an email using nodemailer with a pre-rendered HTML string.
 */
export async function sendRawEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
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

function buildSystemUrls(token: string) {
  const base = getAppBaseUrl();
  const inviteUrl = `${base}/auth/set-password?token=${token}`;

  return {
    ...getDefaultSystemLinkMergeData(),
    passwordReset: inviteUrl,
    emailVerification: inviteUrl,
    invitation: inviteUrl,
    login: `${base}/auth/login`,
  };
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
  const template = await resolveSystemTemplate(systemKey, projectId);
  if (!template) return false;

  const templateDataOptions =
    template.dataset === 'LENDER_YEARLY'
      ? (() => {
          const y = additionalMergeData?.year;
          if (typeof y === 'number' && Number.isFinite(y)) return { year: y };
          if (typeof y === 'string' && /^\d{4}$/.test(y)) return { year: Number.parseInt(y, 10) };
          return { year: new Date().getFullYear() - 1 };
        })()
      : undefined;

  const templateData = await getTemplateData(
    template.dataset,
    templateRecordId,
    'de',
    projectId ?? undefined,
    templateDataOptions,
  );
  if (!templateData) return false;

  const mergeData: Record<string, unknown> = {
    ...templateData,
    ...(additionalMergeData ?? {}),
  };

  let logoUrl: string | null = null;
  const configLogo = (mergeData.config as { logo?: unknown } | undefined)?.logo;
  if (typeof configLogo === 'string' && configLogo.length > 0) {
    logoUrl = configLogo;
  } else if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        configuration: {
          select: { logo: true },
        },
      },
    });
    logoUrl = project?.configuration?.logo ?? null;
  }

  const html = renderSystemEmailTemplate(template.designJson, mergeData, { logoUrl });
  if (!html) return false;

  const finalSubject = resolveTemplateSubject(
    template.subjectOrFilename,
    mergeData as Record<string, unknown>,
    subject,
  );

  await sendRawEmail(to, finalSubject, html);
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

/** Render a stored communication template (design JSON) and send to one recipient. */
export async function renderAndSendCommunicationTemplateEmail(args: {
  designJson: unknown;
  subjectOrFilename: string | null;
  mergeData: Record<string, unknown>;
  to: string;
  fallbackSubject: string;
  logoUrl: string | null;
}): Promise<boolean> {
  const html = renderSystemEmailTemplate(args.designJson, args.mergeData, { logoUrl: args.logoUrl });
  if (!html) return false;
  const finalSubject = resolveTemplateSubject(
    args.subjectOrFilename,
    args.mergeData,
    args.fallbackSubject,
  );
  await sendRawEmail(args.to, finalSubject, html);
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
  const systemUrls = buildSystemUrls(token);
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
  const systemUrls = buildSystemUrls(token);

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
      subject: 'Neue Zahlung',
    });
  } catch (err) {
    console.error('Failed to send transaction notification email', err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string, userId: string, locale = 'de') {
  const systemUrls = buildSystemUrls(token);
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
    console.error('Failed to render password reset template, falling back to legacy', err);
  }

  // Import the email template dynamically to avoid SSR issues
  const { PasswordResetEmail } = await import('@/emails/password-reset-email');

  return sendEmail(to, 'Passwort zurücksetzen', React.createElement(PasswordResetEmail, { name, resetUrl, locale }));
}
