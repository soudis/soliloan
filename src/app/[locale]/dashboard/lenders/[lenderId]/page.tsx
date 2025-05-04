"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { use, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getLenderById } from "@/app/actions/lenders";
import { LenderInfoCard } from "@/components/lenders/lender-info-card";
import { LoanCard } from "@/components/loans/loan-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useProject } from "@/store/project-context";

// Function to fetch lender data using the server action
const fetchLender = async (lenderId: string) => {
  const result = await getLenderById(lenderId);

  if ("error" in result) {
    throw new Error(result.error);
  }

  return result.lender;
};

export default function LenderDetailsPage({
  params,
}: {
  params: Promise<{ lenderId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedProject } = useProject();
  const t = useTranslations("dashboard.lenders");
  const commonT = useTranslations("common");
  const highlightedLoanRef = useRef<HTMLDivElement>(null);

  // Get the loan ID to highlight from the URL query parameter
  const highlightLoanId = searchParams.get("highlightLoan");

  // Use React Query to fetch lender data
  const {
    data: lender,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["lender", resolvedParams.lenderId],
    queryFn: () => fetchLender(resolvedParams.lenderId),
    enabled: !!resolvedParams.lenderId,
  });

  // Scroll to the highlighted loan when the component mounts or when highlightLoanId changes
  useEffect(() => {
    if (highlightLoanId && highlightedLoanRef.current) {
      // Use a small timeout to ensure the DOM is fully rendered
      setTimeout(() => {
        highlightedLoanRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [highlightLoanId, lender]);

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    toast.error(t("details.error"));
    return <div>Error loading lender data</div>;
  }

  if (!lender) {
    return <div>Lender not found</div>;
  }

  const lenderName =
    lender.type === "PERSON"
      ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ""}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ""}`
      : lender.organisationName;

  // Map the lender data to match the expected type for LenderInfoCard

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lenderName}</h1>
          <p className="text-muted-foreground">
            #{lender.lenderNumber} ·{" "}
            {commonT(`enums.lender.type.${lender.type}`)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/lenders/${lender.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("details.edit")}
          </Button>
          <Button
            onClick={() =>
              router.push(`/dashboard/loans/new?lenderId=${lender.id}`)
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("details.newLoan")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Loan Cards Section - Left side on desktop, bottom on mobile */}
        <div className="w-full lg:w-2/3 space-y-4">
          <h2 className="text-2xl font-semibold">{t("details.loans")}</h2>
          <div className="space-y-6">
            {lender.loans.map((loan) => {
              // Calculate loan fields with the lender context

              return (
                <div
                  key={loan.id}
                  ref={highlightLoanId === loan.id ? highlightedLoanRef : null}
                >
                  <LoanCard
                    loan={loan}
                    onView={(id) => router.push(`/dashboard/loans/${id}`)}
                    onEdit={(id) => router.push(`/dashboard/loans/${id}/edit`)}
                    className={
                      highlightLoanId === loan.id
                        ? "ring-1 ring-primary/70"
                        : ""
                    }
                  />
                </div>
              );
            })}
            {lender.loans.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {commonT("ui.table.noResults")}
              </div>
            )}
          </div>
        </div>

        {/* Lender Information Section - Right side on desktop, top on mobile */}
        <div className="w-full lg:w-1/3">
          <h2 className="text-2xl font-semibold mb-4">
            {t("details.lenderInfo")}
          </h2>
          <LenderInfoCard lender={lender} />
        </div>
      </div>
    </div>
  );
}
