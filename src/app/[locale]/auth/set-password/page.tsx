"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SetPasswordPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("setPassword.invalidToken")}</CardTitle>
          <CardDescription>
            {t("setPassword.invalidTokenDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          {t("setPassword.title")}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t("setPassword.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("setPassword.title")}</CardTitle>
          <CardDescription>{t("setPassword.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
