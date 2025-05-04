"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-center p-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/soliloan-logo.webp"
            alt="Soliloan AI Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-xl font-bold text-primary font-comfortaa">
            Soliloan AI
          </span>
        </div>
      </div>

      {/* Split screen layout */}
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden md:flex md:min-w-[400px] lg:w-[45%] items-center justify-center relative">
          <div className="max-w-3xl text-center space-y-6 p-12">
            <div className="px-24 py-20">
              <div className="flex items-center justify-center space-x-6">
                <Image
                  src="/soliloan-logo.webp"
                  alt="Soliloan AI Logo"
                  width={96}
                  height={96}
                  className="h-24 w-24"
                />
                <span className="text-5xl font-bold text-primary font-comfortaa">
                  Soliloan AI
                </span>
              </div>
              <p className="text-2xl text-primary mt-8">
                {t("branding.description")}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border" />

        {/* Right side - Auth form */}
        <div className="flex-1 md:min-w-[500px] flex items-center justify-start p-6 md:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
