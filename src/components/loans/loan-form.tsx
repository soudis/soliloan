"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DurationType } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { getLendersByProjectId } from "@/app/actions/lenders";
import { Form } from "@/components/ui/form";
import { FormActions } from "@/components/ui/form-actions";
import { FormLayout } from "@/components/ui/form-layout";
import { loanFormSchema } from "@/lib/schemas/loan";
import { emptyStringToNull, formatNumber } from "@/lib/utils";
import { useProject } from "@/store/project-context";
import { LoanWithRelations } from "@/types/loans";

import { LoanFormFields } from "./loan-form-fields";

import type { LoanFormData } from "@/lib/schemas/loan";

interface LoanFormProps {
  title: string;
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  onSubmit: (data: LoanFormData) => Promise<void>;
  initialData?: Partial<LoanWithRelations>;
  isLoading?: boolean;
  error?: string | null;
}

export function LoanForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  isLoading,
  error,
}: LoanFormProps) {
  const { selectedProject } = useProject();

  const { data: lenders = [], isLoading: isLoadingLenders } = useQuery({
    queryKey: ["lenders", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const { lenders: fetchedLenders, error } = await getLendersByProjectId(
        selectedProject.id
      );
      if (error) throw new Error(error);
      return fetchedLenders || [];
    },
    enabled: !!selectedProject,
  });

  // Create base default values that apply to all termination types
  const defaultValues = {
    lenderId: initialData?.lenderId || "",
    signDate: initialData?.signDate || "",
    amount: formatNumber(initialData?.amount) || ("" as const),
    interestRate:
      formatNumber(initialData?.interestRate, 0, 3) || ("" as const),
    interestPaymentType: initialData?.interestPaymentType || "YEARLY",
    interestPayoutType: initialData?.interestPayoutType || "MONEY",
    altInterestMethod: initialData?.altInterestMethod || null,
    contractStatus: initialData?.contractStatus || "PENDING",
    terminationType: initialData?.terminationType || "TERMINATION",
    endDate: initialData?.endDate || "",
    terminationDate: initialData?.terminationDate || "",
    terminationPeriod: initialData?.terminationPeriod || "",
    terminationPeriodType:
      initialData?.terminationPeriodType || DurationType.MONTHS,
    duration: initialData?.duration || "",
    durationType: initialData?.durationType || DurationType.YEARS,
  };

  const form = useForm({
    resolver: zodResolver(loanFormSchema),
    defaultValues: defaultValues,
  });

  if (!selectedProject) {
    return null;
  }

  if (isLoadingLenders) {
    return null;
  }

  const handleSubmit = form.handleSubmit(async (formData: LoanFormData) => {
    try {
      // Convert empty strings to null
      const processedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          emptyStringToNull(value),
        ])
      ) as LoanFormData;

      await onSubmit(processedData);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  });

  return (
    <FormLayout title={title} error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <LoanFormFields lenders={lenders} />

          <FormActions
            submitButtonText={submitButtonText}
            submittingButtonText={submittingButtonText}
            cancelButtonText={cancelButtonText}
            isLoading={isLoading}
          />
        </form>
      </Form>
    </FormLayout>
  );
}
