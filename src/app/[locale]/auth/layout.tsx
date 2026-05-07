'use server';

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { getSoliloanProjectName } from '@/lib/project-name';
import { getSauriasslOrgUrl } from '@/lib/public-site-urls';
import { cn } from '@/lib/utils';

function AuthPoweredBy({
  href,
  text,
  ariaLabel,
  className,
}: {
  href: string;
  text: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={cn(
        'group flex w-full flex-col items-end gap-2 self-stretch rounded-md outline-none transition-[color,opacity]',
        'sm:flex-row sm:items-center sm:justify-end sm:gap-3',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <p className="max-w-[18rem] text-right text-xs leading-snug tracking-tight text-muted-foreground transition-colors group-hover:text-foreground md:text-sm">
        {text}
      </p>
      <Image
        src="/sauriassl.png"
        alt=""
        width={200}
        height={200}
        sizes="(min-width: 640px) 2.5rem, 2.25rem"
        className="h-9 w-auto shrink-0 opacity-80 transition-opacity group-hover:opacity-100 md:h-10 dark:opacity-75 dark:group-hover:opacity-90"
      />
    </a>
  );
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth');
  const projectName = getSoliloanProjectName();
  const poweredByText = t('branding.poweredByText');
  const poweredByLinkAria = t('branding.poweredByLinkAria');
  const sauriasslOrgUrl = getSauriasslOrgUrl();

  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6 px-4 py-2 md:items-stretch md:justify-start md:gap-0 md:p-0">
      {/* Mobile: grouped with main content and vertically centered via outer flex */}
      <div className="flex shrink-0 flex-col items-center gap-3 md:hidden">
        <Image src="/soliloan-logo.webp" alt="" width={256} height={256} className="h-32 w-32" />
        <span className="text-3xl font-bold text-primary font-comfortaa">{projectName}</span>
      </div>

      {/* Split screen layout */}
      <div className="flex w-full flex-col md:flex-1 md:min-h-0 md:flex-row">
        {/* Left side - Branding */}
        <div className="hidden md:flex md:min-w-[400px] lg:w-[45%] items-center justify-center relative md:p-8 lg:p-12">
          <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Image src="/soliloan-logo.webp" alt="" width={96} height={96} className="h-24 w-24" />
              <span className="text-5xl font-bold text-primary font-comfortaa">{projectName}</span>
            </div>

            <p className="w-full text-2xl text-primary">{t('branding.description')}</p>
            <div className="flex w-full justify-end">
              <AuthPoweredBy
                href={sauriasslOrgUrl}
                text={poweredByText}
                ariaLabel={poweredByLinkAria}
                className="mt-0 w-auto max-w-full flex-row items-center justify-end gap-2 sm:gap-3"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border" />

        {/* Right side - Auth form */}
        <div className="flex w-full flex-col md:min-w-[500px] md:flex-1 md:flex-row md:items-center md:justify-start md:p-12">
          <div className="mx-auto w-full max-w-md md:mx-0">
            <div className="mb-5 flex w-full justify-end md:hidden pr-4">
              <AuthPoweredBy
                href={sauriasslOrgUrl}
                text={poweredByText}
                ariaLabel={poweredByLinkAria}
                className="w-auto max-w-full flex-row items-center justify-end gap-2"
              />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
