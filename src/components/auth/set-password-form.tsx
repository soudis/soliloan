"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { setPassword } from "@/app/actions/auth";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

// Define the form schema
const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

interface SetPasswordFormProps {
  token: string;
}

export function SetPasswordForm({ token }: SetPasswordFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const result = await setPassword(token, data.password);
      if (result.success) {
        toast.success(t("setPassword.success"));
        router.push("/auth/login");
      } else {
        toast.error(result.error || t("setPassword.error"));
      }
    } catch (error) {
      console.error("Error setting password:", error);
      toast.error(t("setPassword.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="password"
          label={t("setPassword.password")}
          placeholder="********"
          type="password"
        />
        <FormField
          name="confirmPassword"
          label={t("setPassword.confirmPassword")}
          placeholder="********"
          type="password"
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("setPassword.submitting") : t("setPassword.submit")}
        </Button>
      </form>
    </Form>
  );
}
