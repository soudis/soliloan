"use client";

import {
  ContractStatus,
  DurationType,
  InterestPaymentType,
  InterestPayoutType,
  Lender,
  TerminationType,
} from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";

import { FormDatePicker } from "@/components/form/form-date-picker";
import { FormNumberInput } from "@/components/form/form-number-input";
import { FormNumberWithSelect } from "@/components/form/form-number-with-select";
import { FormSelect } from "@/components/form/form-select";
import { LenderCombobox } from "@/components/loans/lender-combobox";
import { FormSection } from "@/components/ui/form-section";
import { useProject } from "@/store/project-context";

import type { LoanFormData } from "@/lib/schemas/loan";

interface LoanFormFieldsProps {
  form: UseFormReturn<LoanFormData>;
  lenders: Lender[];
}

export function LoanFormFields({ form, lenders }: LoanFormFieldsProps) {
  const t = useTranslations("dashboard.loans");
  const commonT = useTranslations("common");
  const searchParams = useSearchParams();
  const terminationType = form.watch("terminationType");

  const preselectedLenderId = searchParams.get("lenderId");
  const { selectedProject } = useProject();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section */}
      <FormSection title={t("new.form.generalInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LenderCombobox
            name="lenderId"
            label={t("new.form.lender") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            disabled={!!preselectedLenderId}
            lenders={lenders}
          />

          <FormDatePicker
            name="signDate"
            label={t("new.form.signDate") + " *"}
            placeholder={commonT("ui.form.enterPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            name="amount"
            label={t("new.form.amount") + " *"}
            placeholder={commonT("ui.form.enterPlaceholder")}
            min={0.01}
            step={0.01}
          />

          <FormNumberInput
            name="interestRate"
            label={t("new.form.interestRate") + " *"}
            placeholder={commonT("ui.form.enterPlaceholder")}
            min={0}
            step={0.01}
          />
        </div>
        <FormSelect
          name="contractStatus"
          label={t("new.form.contractStatus")}
          placeholder={commonT("ui.form.selectPlaceholder")}
          options={Object.keys(ContractStatus).map((key) => ({
            value: key,
            label: commonT(`enums.loan.contractStatus.${key}`),
          }))}
        />
      </FormSection>

      {/* Termination Information Section */}
      <FormSection title={t("new.form.terminationInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            name="terminationType"
            label={t("new.form.terminationType") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.keys(TerminationType).map((key) => ({
              value: key,
              label: commonT(`enums.loan.terminationType.${key}`),
            }))}
          />
        </div>
        {terminationType === "ENDDATE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormDatePicker
              name="endDate"
              label={t("new.form.endDate") + " *"}
              placeholder={commonT("ui.form.enterPlaceholder")}
            />
          </div>
        )}
        {terminationType === "TERMINATION" && (
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormNumberWithSelect
                numberName="terminationPeriod"
                selectName="terminationPeriodType"
                numberLabel={t("new.form.terminationPeriod") + " *"}
                numberPlaceholder={commonT("ui.form.enterPlaceholder")}
                selectPlaceholder={commonT("ui.form.selectPlaceholder")}
                numberMin={1}
                selectOptions={Object.keys(DurationType).map((key) => ({
                  value: key,
                  label: commonT(`enums.loan.durationUnit.${key}`),
                }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormDatePicker
                name="terminationDate"
                label={t("new.form.terminationDate")}
                placeholder={commonT("ui.form.enterPlaceholder")}
              />
            </div>
          </div>
        )}

        {terminationType === "DURATION" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberWithSelect
              numberName="duration"
              selectName="durationType"
              numberLabel={t("new.form.duration") + " *"}
              numberPlaceholder={commonT("ui.form.enterPlaceholder")}
              selectPlaceholder={commonT("ui.form.selectPlaceholder")}
              numberMin={1}
              selectOptions={Object.keys(DurationType).map((key) => ({
                value: key,
                label: commonT(`enums.loan.durationUnit.${key}`),
              }))}
            />
          </div>
        )}
      </FormSection>

      {/* Additional Information Section */}
      <FormSection title={t("new.form.additionalInfo")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            name="interestPaymentType"
            label={t("new.form.interestPaymentType") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.keys(InterestPaymentType).map((key) => ({
              value: key,
              label: commonT(`enums.loan.interestPaymentType.${key}`),
            }))}
          />

          <FormSelect
            name="interestPayoutType"
            label={t("new.form.interestPayoutType") + " *"}
            placeholder={commonT("ui.form.selectPlaceholder")}
            options={Object.keys(InterestPayoutType).map((key) => ({
              value: key,
              label: commonT(`enums.loan.interestPayoutType.${key}`),
            }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(selectedProject?.configuration.altInterestMethods.length ?? 0) >
            0 && (
            <FormSelect
              name="altInterestMethod"
              label={t("new.form.altInterestMethod")}
              placeholder={`${commonT(`enums.interestMethod.${selectedProject?.configuration.interestMethod}`)} (${commonT("default")})`}
              options={(
                selectedProject?.configuration.altInterestMethods ?? []
              ).map((key) => ({
                value: key,
                label: commonT(`enums.interestMethod.${key}`),
              }))}
            />
          )}
        </div>
      </FormSection>
    </div>
  );
}
