import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.page');
  return {
    title: t('title'),
  };
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>;
}

export default async function LegalPage() {
  const t = await getTranslations('legal.page');
  const contactEmail = t('contactEmail');

  return (
    <div className="bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t('title')}</h1>

        <section className="mt-10 space-y-8" id="impressum">
          <div>
            <h2 className="text-foreground text-lg font-medium">{t('tmHeading')}</h2>

            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-foreground text-base font-medium">{t('operatorsHeading')}</h3>
                <Paragraph>{t('operatorsBody')}</Paragraph>
              </div>

              <div className="space-y-3">
                <h3 className="text-foreground text-base font-medium">{t('imprintBlockHeading')}</h3>
                <div className="text-muted-foreground space-y-0.5 text-sm leading-relaxed">
                  <p className="font-medium text-foreground">{t('orgName')}</p>
                  <p>{t('orgStreet')}</p>
                  <p>{t('orgCity')}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-foreground font-medium">{t('representedByLabel')}</p>
                <p className="text-muted-foreground leading-relaxed">{t('representedByName')}</p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-foreground font-medium">{t('contactLabel')}</p>
                <p className="text-muted-foreground leading-relaxed">
                  <a href={`mailto:${contactEmail}`} className="text-primary underline-offset-2 hover:underline">
                    {contactEmail}
                  </a>
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-foreground font-medium">{t('registerHeading')}</p>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{t('registerBody')}</p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-foreground font-medium">{t('mediaResponsibilityHeading')}</p>
                <div className="text-muted-foreground space-y-0.5 leading-relaxed">
                  <p>{t('mediaResponsibilityName')}</p>
                  <p>{t('mediaResponsibilityStreet')}</p>
                  <p>{t('mediaResponsibilityCity')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-foreground text-base font-medium">{t('liabilityLinksHeading')}</h3>
                <Paragraph>{t('liabilityLinksBody')}</Paragraph>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-4" id="datenschutz">
          <h2 className="text-foreground text-lg font-medium">{t('privacyTitle')}</h2>
          <Paragraph>{t('privacyP1')}</Paragraph>
          <Paragraph>{t('privacyP2')}</Paragraph>
        </section>
      </main>
    </div>
  );
}
