'use server';

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { getSoliloanProjectName } from '@/lib/project-name';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth');
  const projectName = getSoliloanProjectName();

  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6 px-4 py-6 md:items-stretch md:justify-start md:gap-0 md:p-0">
      {/* Mobile: grouped with main content and vertically centered via outer flex */}
      <div className="flex shrink-0 flex-col items-center gap-3 md:hidden">
        <Image src="/soliloan-logo.webp" alt="" width={256} height={256} className="h-48 w-48" />
        <span className="text-2xl font-bold text-primary font-comfortaa">{projectName}</span>
      </div>

      {/* Split screen layout */}
      <div className="flex w-full flex-col md:flex-1 md:min-h-0 md:flex-row">
        {/* Left side - Branding */}
        <div className="hidden md:flex md:min-w-[400px] lg:w-[45%] items-center justify-center relative">
          <div className="max-w-3xl text-center space-y-6 p-12">
            <div className="px-24 py-20">
              <div className="flex items-center justify-center space-x-6">
                <Image src="/soliloan-logo.webp" alt="" width={96} height={96} className="h-24 w-24" />
                <span className="text-5xl font-bold text-primary font-comfortaa">{projectName}</span>
              </div>
              <p className="text-2xl text-primary mt-8">{t('branding.description')}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border" />

        {/* Right side - Auth form */}
        <div className="flex w-full flex-col md:min-w-[500px] md:flex-1 md:flex-row md:items-center md:justify-start md:p-12">
          <div className="mx-auto w-full max-w-md md:mx-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
