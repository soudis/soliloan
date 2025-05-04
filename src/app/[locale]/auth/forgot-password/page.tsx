"use client";

import { useTranslations } from "next-intl";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          {t("forgotPassword.title")}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t("forgotPassword.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("forgotPassword.title")}</CardTitle>
          <CardDescription>{t("forgotPassword.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
