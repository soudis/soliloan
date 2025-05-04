"use client";

import {
  LenderType,
  MembershipStatus,
  NotificationType,
  Salutation,
} from "@prisma/client";
import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";

import { FormCountrySelect } from "@/components/form/form-country-select";
import { FormField } from "@/components/form/form-field";
import { FormIbanInput } from "@/components/form/form-iban-input";
import { FormSelect } from "@/components/form/form-select";
import { FormSection } from "@/components/ui/form-section";

import type { LenderFormData } from "@/lib/schemas/lender";

interface LenderFormFieldsProps {
  form: UseFormReturn<LenderFormData>;
}

export function LenderFormFields({ form }: LenderFormFieldsProps) {
  const t = useTranslations("dashboard.lenders");
  const commonT = useTranslations("common");
  const type = form.watch("type");
  const salutation = form.watch("salutation");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section */}
      <FormSection title={t("new.form.generalInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            name="type"
            label={t("new.form.type") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.entries(LenderType).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.type.${key}`),
            }))}
          />

          <FormSelect
            name="salutation"
            label={t("new.form.salutation") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.entries(Salutation).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.salutation.${key}`),
            }))}
          />
        </div>

        {type === "PERSON" ? (
          <>
            {salutation === "FORMAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="titlePrefix"
                  label={t("new.form.titlePrefix")}
                  placeholder={commonT("ui.form.enterPlaceholder")}
                />

                <FormField
                  name="titleSuffix"
                  label={t("new.form.titleSuffix")}
                  placeholder={commonT("ui.form.enterPlaceholder")}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="firstName"
                label={t("new.form.firstName") + " *"}
                placeholder={commonT("ui.form.enterPlaceholder")}
              />

              <FormField
                name="lastName"
                label={t("new.form.lastName") + " *"}
                placeholder={commonT("ui.form.enterPlaceholder")}
              />
            </div>
          </>
        ) : (
          <FormField
            name="organisationName"
            label={t("new.form.organisationName") + " *"}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />
        )}
      </FormSection>

      {/* Contact Information Section */}
      <FormSection title={t("new.form.contactInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="email"
            label={t("new.form.email")}
            placeholder={commonT("ui.form.enterPlaceholder")}
            type="email"
          />

          <FormField
            name="telNo"
            label={t("new.form.telNo")}
            placeholder={commonT("ui.form.enterPlaceholder")}
            type="tel"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="street"
            label={t("new.form.street")}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />

          <FormField
            name="addon"
            label={t("new.form.addon")}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <FormField
              name="zip"
              label={t("new.form.zip")}
              placeholder={commonT("ui.form.enterPlaceholder")}
            />
          </div>

          <div className="md:col-span-4">
            <FormField
              name="place"
              label={t("new.form.place")}
              placeholder={commonT("ui.form.enterPlaceholder")}
            />
          </div>

          <div className="md:col-span-6">
            <FormCountrySelect
              name="country"
              label={t("new.form.country")}
              placeholder={commonT("ui.form.selectPlaceholder")}
            />
          </div>
        </div>
      </FormSection>

      {/* Banking Information Section */}
      <FormSection title={t("new.form.bankingInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormIbanInput
            name="iban"
            label={t("new.form.iban")}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />

          <FormField
            name="bic"
            label={t("new.form.bic")}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />
        </div>
      </FormSection>

      {/* Additional Information Section */}
      <FormSection title={t("new.form.additionalInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            name="notificationType"
            label={t("new.form.notificationType") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.entries(NotificationType).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.notificationType.${key}`),
            }))}
          />

          <FormSelect
            name="membershipStatus"
            label={t("new.form.membershipStatus")}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.entries(MembershipStatus).map(([key, value]) => ({
              value,
              label: commonT(`enums.lender.membershipStatus.${key}`),
            }))}
          />
        </div>

        <FormField
          name="tag"
          label={t("new.form.tag")}
          placeholder={commonT("ui.form.enterPlaceholder")}
        />
      </FormSection>
    </div>
  );
}
