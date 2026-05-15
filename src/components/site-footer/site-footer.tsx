import { Github } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { AgplMark } from '@/components/legal/agpl-mark';
import { Link } from '@/i18n/navigation';
import { getAgplV3LicenseUrl, getPublicGithubUrl } from '@/lib/public-site-urls';
import { cn } from '@/lib/utils';

export async function SiteFooter() {
  const t = await getTranslations('legal.footer');
  const locale = await getLocale();
  const licenseHref = getAgplV3LicenseUrl(locale);
  const githubUrl = getPublicGithubUrl();

  return (
    <footer className="shrink-0 border-t border-border/70 bg-background">
      <div
        className={cn(
          'mx-auto flex max-w-[1600px] flex-nowrap items-center justify-end gap-x-2 sm:gap-x-4 md:gap-x-5',
          'px-4 py-2 text-[11px] leading-none text-muted-foreground sm:px-6 sm:py-2.5 sm:text-xs sm:leading-normal',
        )}
      >
        <div className="flex min-w-0 shrink items-center gap-1 sm:gap-1.5">
          <AgplMark />
          <span className="hidden whitespace-nowrap sm:inline">{t('licensePrefix')}</span>
          <a
            href={licenseHref}
            target="_blank"
            rel="license noopener noreferrer"
            className="shrink-0 whitespace-nowrap text-primary underline-offset-2 hover:underline"
            aria-label={t('licenseExternalAria')}
          >
            <span className="sm:hidden">{t('licenseLinkShort')}</span>
            <span className="hidden sm:inline">{t('licenseLink')}</span>
          </a>
        </div>
        <span className="shrink-0 text-muted-foreground/35 select-none" aria-hidden>
          ·
        </span>
        <Link href="/legal" className="shrink-0 whitespace-nowrap text-primary underline-offset-2 hover:underline">
          <span className="sm:hidden">{t('imprintPrivacyShort')}</span>
          <span className="hidden sm:inline">{t('imprintPrivacy')}</span>
        </Link>
        <span className="shrink-0 text-muted-foreground/35 select-none" aria-hidden>
          ·
        </span>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-primary underline-offset-2 hover:underline sm:gap-1.5"
          aria-label={t('githubAria')}
        >
          <Github className="size-3 shrink-0 text-foreground/70 sm:size-3.5" aria-hidden />
          <span className="hidden whitespace-nowrap sm:inline">{t('github')}</span>
        </a>
      </div>
    </footer>
  );
}
