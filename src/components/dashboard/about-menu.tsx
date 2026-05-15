'use client';

import { Github, Info, Scale } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AgplMark } from '@/components/legal/agpl-mark';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { getAgplV3LicenseUrl, getPublicGithubUrl } from '@/lib/public-site-urls';

export function AboutMenu() {
  const tNav = useTranslations('navigation');
  const tLegal = useTranslations('legal.footer');
  const locale = useLocale();
  const licenseHref = getAgplV3LicenseUrl(locale);
  const githubUrl = getPublicGithubUrl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label={tNav('aboutMenuAria')}
        >
          <Info className="h-4 w-4 shrink-0 opacity-80" />
          <span className="hidden sm:inline">{tNav('about')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
            <AgplMark />
            <span>
              {tLegal('licensePrefix')}{' '}
              <a
                href={licenseHref}
                target="_blank"
                rel="license noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {tLegal('licenseLink')}
              </a>
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/legal" className="flex cursor-pointer items-center gap-2">
            <Scale className="h-4 w-4 opacity-70" />
            {tLegal('imprintPrivacy')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer items-center gap-2"
            aria-label={tLegal('githubAria')}
          >
            <Github className="h-4 w-4 opacity-70" />
            {tLegal('github')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
