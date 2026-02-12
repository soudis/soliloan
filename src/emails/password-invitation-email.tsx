import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';
import { AbstractIntlMessages, createTranslator } from 'next-intl';
import type * as React from 'react';

interface PasswordInvitationEmailProps {
  name: string;
  resetUrl: string;
  projectName: string;
  locale?: string;
}

export const PasswordInvitationEmail: React.FC<PasswordInvitationEmailProps> = async ({
  name,
  resetUrl,
  projectName,
  locale = 'de',
}) => {
  // Load translations for the specified locale
  // biome-ignore lint/suspicious/noImplicitAnyLet: needed
  let messages;
  try {
    messages = (await import(`../messages/${locale}/emails.json`)).default;
  } catch (error) {
    // Fallback to German if the requested locale is not available
    messages = (await import('../messages/de/emails.json')).default;
    console.error(error);
  }

  // Create a translator instance
  const t = createTranslator({ locale, messages });

  return (
    <Html>
      <Head />
      <Preview>
        {t('passwordInvitation.preview', {
          domain: process.env.SOLILOAN_DOMAIN ?? '',
        })}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {t('passwordInvitation.title', {
              domain: process.env.SOLILOAN_DOMAIN ?? '',
            })}
          </Heading>
          <Text style={greeting}>{t('passwordInvitation.greeting', { name })}</Text>
          <Text style={text}>
            {t('passwordInvitation.message', {
              projectName,
              domain: process.env.SOLILOAN_DOMAIN ?? '',
            })}
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              {t('passwordInvitation.button')}
            </Button>
          </Section>
          <Text style={text}>{t('passwordInvitation.fallbackText')}</Text>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
          <Text style={footer}>
            {t('passwordInvitation.footer', {
              domain: process.env.SOLILOAN_DOMAIN ?? '',
            })}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '32px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 32px 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  maxWidth: '480px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '26px',
  fontWeight: '700',
  lineHeight: '1.25',
  margin: '8px 0 32px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
  textAlign: 'left' as const,
};

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
  textAlign: 'left' as const,
  fontWeight: '700',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0 24px',
};

const button = {
  backgroundColor: '#000',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
};

const link = {
  color: '#000',
  fontSize: '15px',
  textDecoration: 'underline',
  margin: '12px 0',
  display: 'block',
  wordBreak: 'break-all' as const,
};

const footer = {
  color: '#9ca299',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};

export default PasswordInvitationEmail;
