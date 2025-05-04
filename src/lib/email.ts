import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import React from "react";

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email using nodemailer
 * @param to Recipient email address
 * @param subject Email subject
 * @param html React email component to render
 * @returns Promise with the result of the email sending
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: React.ReactElement
) {
  // Render the React email component to HTML
  const htmlContent = render(html);

  // Send the email
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: await htmlContent,
  });
}

/**
 * Send a password reset invitation email
 * @param to Recipient email address
 * @param name Recipient name
 * @param token Password reset token
 * @param locale User's preferred language (defaults to 'de')
 * @returns Promise with the result of the email sending
 */
export async function sendPasswordInvitationEmail(
  to: string,
  name: string,
  token: string,
  locale: string = "de",
  projectName: string
) {
  const resetUrl = `${process.env.SOLILOAN_URL}/auth/set-password?token=${token}`;

  // Import the email template dynamically to avoid SSR issues
  const { PasswordInvitationEmail } = await import(
    "@/emails/password-invitation-email"
  );

  return sendEmail(
    to,
    "Danke für deinen Direktkredit",
    React.createElement(PasswordInvitationEmail, {
      name,
      resetUrl,
      locale,
      projectName,
    })
  );
}

/**
 * Send a password reset email
 * @param to Recipient email address
 * @param name Recipient name
 * @param token Password reset token
 * @param locale User's preferred language (defaults to 'de')
 * @returns Promise with the result of the email sending
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  locale: string = "de"
) {
  const resetUrl = `${process.env.SOLILOAN_URL}/auth/set-password?token=${token}`;

  // Import the email template dynamically to avoid SSR issues
  const { PasswordResetEmail } = await import("@/emails/password-reset-email");

  return sendEmail(
    to,
    "Passwort zurücksetzen",
    React.createElement(PasswordResetEmail, { name, resetUrl, locale })
  );
}
