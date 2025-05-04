"use client";

import { useTranslations } from "next-intl";

import { FormDatePicker } from "@/components/form/form-date-picker";
import { FormNumberInput } from "@/components/form/form-number-input";
import { FormSelect } from "@/components/form/form-select";

export function TransactionFormFields() {
  const t = useTranslations("dashboard.loans");
  const commonT = useTranslations("common");

  return (
    <>
      <FormSelect
        name="type"
        label={t("transactions.type")}
        placeholder={commonT("ui.form.selectPlaceholder")}
        options={[
          {
            value: "DEPOSIT",
            label: commonT("enums.transaction.type.DEPOSIT"),
          },
          {
            value: "WITHDRAWAL",
            label: commonT("enums.transaction.type.WITHDRAWAL"),
          },
          {
            value: "INTEREST",
            label: commonT("enums.transaction.type.INTEREST"),
          },
          {
            value: "INTERESTPAYMENT",
            label: commonT("enums.transaction.type.INTERESTPAYMENT"),
          },
          {
            value: "TERMINATION",
            label: commonT("enums.transaction.type.TERMINATION"),
          },
          {
            value: "NOTRECLAIMEDPARTIAL",
            label: commonT("enums.transaction.type.NOTRECLAIMEDPARTIAL"),
          },
          {
            value: "NOTRECLAIMED",
            label: commonT("enums.transaction.type.NOTRECLAIMED"),
          },
        ]}
      />

      <FormDatePicker
        name="date"
        label={t("transactions.date")}
        placeholder={commonT("ui.form.enterPlaceholder")}
      />

      <FormNumberInput
        name="amount"
        label={t("transactions.amount")}
        placeholder={commonT("ui.form.enterPlaceholder")}
        step={0.01}
      />

      <FormSelect
        name="paymentType"
        label={t("transactions.paymentType")}
        placeholder={commonT("ui.form.selectPlaceholder")}
        options={[
          {
            value: "BANK",
            label: commonT("enums.transaction.paymentType.BANK"),
          },
          {
            value: "CASH",
            label: commonT("enums.transaction.paymentType.CASH"),
          },
          {
            value: "OTHER",
            label: commonT("enums.transaction.paymentType.OTHER"),
          },
        ]}
      />
    </>
  );
}
