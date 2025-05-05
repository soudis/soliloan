"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { toast } from "sonner";

import { getLoanById, updateLoan } from "@/app/actions/loans";
import { LoanForm } from "@/components/loans/loan-form";
import { useRouter } from "@/i18n/navigation";
import { getLenderName } from "@/lib/utils";
import { useProject } from "@/store/project-context";

import type { LoanFormData } from "@/lib/schemas/loan";

export default function EditLoanPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { selectedProject } = useProject();
  const t = useTranslations("dashboard.loans");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch loan data using React Query
  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", resolvedParams.loanId],
    queryFn: async () => {
      const result = await getLoanById(resolvedParams.loanId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.loan;
    },
    enabled: !!resolvedParams.loanId,
  });

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (isLoading || !loan) {
    return null;
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Update the loan using the server action
      const result = await updateLoan(resolvedParams.loanId, data);

      if (result.error) {
        throw new Error(result.error);
      }

      // Show success message
      toast.success(t("edit.form.success"));
      // invalidate the loan query
      queryClient.invalidateQueries({ queryKey: ["loan"] });

      // Navigate back to the previous page using the router
      router.push(
        `/lenders/${result.loan?.lenderId}?highlightLoan=${result.loan?.id}`
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      toast.error(t("edit.form.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoanForm
      title={t("edit.title", { lenderName: getLenderName(loan.lender) })}
      submitButtonText={t("edit.form.submit")}
      submittingButtonText={t("edit.form.submitting")}
      cancelButtonText={t("edit.form.cancel")}
      onSubmit={handleSubmit}
      initialData={loan}
      isLoading={isSubmitting}
      error={error}
    />
  );
}
