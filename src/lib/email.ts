import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import React from 'react';

import { renderSystemEmailTemplate, resolveSystemTemplate } from '@/lib/templates/resolve-system-template';

const SOLILOAN_URL = (process.env.SOLILOAN_URL ?? '').replace(/\/+$/, '');

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
  const inviteUrl = `${SOLILOAN_URL}/auth/set-password?token=${token}`;

  return {
    passwordReset: inviteUrl,
    emailVerification: inviteUrl,
    invitation: inviteUrl,
    login: `${SOLILOAN_URL}/auth/login`,
  };
}

async function sendSystemTemplateEmail({
  systemKey,
  projectId,
  mergeData,
  to,
  subject,
}: {
  systemKey: string;
  projectId?: string | null;
  mergeData: Record<string, unknown>;
  to: string;
  subject: string;
}) {
  const template = await resolveSystemTemplate(systemKey, projectId);
  if (!template) return false;

  const html = renderSystemEmailTemplate(template.designJson, mergeData);
  if (!html) return false;

  await sendRawEmail(to, subject, html);
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
      const mergeData: Record<string, unknown> = {
        platform: {
          name: process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ?? 'SoliLoan',
        },
        config: lenderContext.configData,
        lender: {
          firstName: name,
          fullName: name,
          email: to,
        },
        system: systemUrls,
      };

      console.log('mergeData', mergeData);

      const sent = await sendSystemTemplateEmail({
        systemKey: 'lender-invite-email',
        projectId: lenderContext.projectId,
        mergeData,
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
    const mergeData: Record<string, unknown> = {
      platform: {
        name: process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ?? 'SoliLoan',
      },
      project: {
        name: managerContext.projectName,
        slug: managerContext.projectSlug,
      },
      config: managerContext.configData,
      system: systemUrls,
    };

    const sent = await sendSystemTemplateEmail({
      systemKey: 'manager-invite-email',
      projectId: managerContext.projectId,
      mergeData,
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
export async function sendPasswordResetEmail(to: string, name: string, token: string, locale = 'de') {
  const systemUrls = buildSystemUrls(token);
  const resetUrl = systemUrls.passwordReset;

  try {
    const mergeData: Record<string, unknown> = {
      platform: {
        name: process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ?? 'SoliLoan',
      },
      user: {
        name,
        email: to,
      },
      system: systemUrls,
    };

    const sent = await sendSystemTemplateEmail({
      systemKey: 'password-reset-email',
      projectId: null,
      mergeData,
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
