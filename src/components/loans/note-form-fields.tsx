"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";

import { FormField } from "@/components/form/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { NoteFormData } from "@/lib/schemas/note";

export function NoteFormFields() {
  const t = useTranslations("dashboard.notes");
  const form = useFormContext<NoteFormData>();

  return (
    <>
      <FormField
        name="text"
        label={t("text")}
        placeholder={t("textPlaceholder")}
        multiline={true}
      />

      <FormFieldWrapper
        control={form.control}
        name="public"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>{t("public")}</FormLabel>
              <p className="text-sm text-muted-foreground">
                {t("publicDescription")}
              </p>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
