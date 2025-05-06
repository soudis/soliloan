"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

import { getLenderById } from "@/app/actions/lenders";
import { deleteLoan } from "@/app/actions/loans";
import { LenderInfoCard } from "@/components/lenders/lender-info-card";
import { LoanCard } from "@/components/loans/loan-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "@/i18n/navigation";
import { useLenderLoanSelectionStore } from "@/lib/stores/lender-loan-selection-store";
import { useProject } from "@/store/project-context";
import { LoanStatus } from "@/types/loans";

// Function to fetch lender data using the server action
const fetchLender = async (lenderId: string) => {
  const result = await getLenderById(lenderId);

  if ("error" in result) {
    throw new Error(result.error);
  }

  return result.lender;
};

// Common Badge component logic
const LoanBadges = ({
  loan,
  commonT,
}: {
  loan: NonNullable<
    Awaited<ReturnType<typeof getLenderById>>["lender"]
  >["loans"][0];
  commonT: ReturnType<typeof useTranslations<string>>; // Adjust type as needed
}) => (
  <div className="flex space-x-1">
    <Badge
      variant={loan.contractStatus === "PENDING" ? "secondary" : "default"}
      className="text-xs px-1.5 py-0.5"
    >
      {commonT(`enums.loan.contractStatus.${loan.contractStatus}`)}
    </Badge>
    <Badge
      variant={
        loan.status === LoanStatus.ACTIVE
          ? "default"
          : loan.status === LoanStatus.TERMINATED
            ? "destructive"
            : loan.status === LoanStatus.NOTDEPOSITED
              ? "secondary"
              : "outline"
      }
      className="text-xs px-1.5 py-0.5"
    >
      {commonT(`enums.loan.status.${loan.status}`)}
    </Badge>
  </div>
);

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
  const queryClient = useQueryClient();
  const loanT = useTranslations("dashboard.loans");
  const { getSelectedLoanId, setSelectedLoanId } =
    useLenderLoanSelectionStore();

  // State for responsive max tabs
  const [maxTabs, setMaxTabs] = useState(4); // Default for SSR/initial

  // Get the loan ID to highlight from the URL query parameter or store
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

  // Effect to update maxTabs based on screen size
  useEffect(() => {
    const checkSize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setMaxTabs(4); // lg and up
      } else if (window.matchMedia("(min-width: 768px)").matches) {
        setMaxTabs(3); // md and up
      } else {
        setMaxTabs(2); // sm and down
      }
    };

    checkSize(); // Initial check on mount
    window.addEventListener("resize", checkSize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkSize);
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // Determine selected Loan ID
  const selectedLoanId =
    (lender?.loans.some(
      (loan) => loan.id === getSelectedLoanId(lender?.id ?? "")
    )
      ? getSelectedLoanId(lender?.id)
      : null) ??
    highlightLoanId ??
    (lender && lender.loans.length > 0 ? lender.loans[0].id : undefined);

  // Handler for selecting a loan (from tabs or dropdown)
  const handleSelectLoan = (loanId: string) => {
    if (!lender) return;
    setSelectedLoanId(lender.id, loanId);
  };

  // Handler for deleting a loan
  const handleDeleteLoan = async (loanId: string) => {
    const toastId = toast.loading(loanT("delete.loading"));

    try {
      const result = await deleteLoan(loanId);

      if (result.error) {
        toast.error(loanT(`errors.${result.error}`), {
          id: toastId,
        });
      } else {
        toast.success(loanT("delete.success"), {
          id: toastId,
        });
        await queryClient.invalidateQueries({
          queryKey: ["lender", resolvedParams.lenderId],
        });
        setSelectedLoanId(
          lender?.id ?? "",
          lender?.loans.find((l) => l.id !== loanId)?.id ?? ""
        );
      }
    } catch (e) {
      toast.error(loanT("delete.error"), {
        id: toastId,
      });
      console.error("Failed to delete loan:", e);
    }
  };

  // Find the currently selected loan object for display
  const selectedLoan = lender?.loans.find((loan) => loan.id === selectedLoanId);

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !lender) {
    toast.error(t("details.error"));
    return <div>Error loading lender data</div>;
  }

  // Determine if tabs or dropdown should be shown using dynamic maxTabs
  const showTabs = lender.loans.length <= maxTabs;

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
            {commonT(`enums.lender.type.${lender.type}`)} ·{" "}
            {lender.loans.length} {t("details.loans")}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/lenders/${lender.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("details.edit")}
          </Button>
          <Button
            onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("details.newLoan")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Loan Cards Section - Left side on desktop, bottom on mobile */}
        <div className="w-full lg:w-2/3 space-y-0">
          {lender.loans.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("noLoans")}
            </div>
          ) : (
            <>
              {/* Loan Selection UI: Tabs or Dropdown */}
              {showTabs ? (
                <Tabs
                  value={selectedLoanId}
                  onValueChange={handleSelectLoan}
                  className="w-full"
                >
                  <TabsList className="px-2.5 flex flex-row flex-wrap justify-start gap-2 h-auto bg-transparent mb-0">
                    {lender.loans.map((loan) => (
                      <TabsTrigger
                        key={loan.id}
                        value={loan.id}
                        className="relative flex flex-col items-start justify-end h-auto rounded-none p-2 transition-transform duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground/60 data-[state=active]:text-foreground data-[state=active]:shadow-none after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:h-[2px] after:bg-transparent data-[state=active]:after:bg-primary cursor-pointer scale-90 data-[state=active]:scale-100 opacity-60 hover:opacity-100 data-[state=active]:opacity-100 origin-bottom"
                      >
                        <h2 className="text-2xl font-semibold mb-1">
                          {loanT("table.loanNumberShort")} #{loan.loanNumber}
                        </h2>
                        <LoanBadges loan={loan} commonT={commonT} />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {/* We render the selected LoanCard outside/below */}
                </Tabs>
              ) : (
                // Dropdown Menu Implementation
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline" // Base variant, override with classes
                      className="relative flex items-center justify-between hover:bg-accent/20 h-auto rounded-none p-2 mb-0 mx-2.5 text-foreground shadow-none border-0 border-b-2 border-primary cursor-pointer bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" // Mimic active tab styles
                    >
                      {selectedLoan ? (
                        <>
                          <div className="flex flex-col items-start text-left">
                            <h2 className="text-2xl font-semibold mb-1">
                              {loanT("table.loanNumberShort")} #
                              {selectedLoan.loanNumber}
                            </h2>
                            <LoanBadges loan={selectedLoan} commonT={commonT} />
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                        </>
                      ) : (
                        <span className="flex items-center">
                          {loanT("dropdown.selectFallback")}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[--radix-dropdown-menu-trigger-width] p-0"
                  >
                    {lender.loans.map((loan, index) => {
                      const isFirst = index === 0;
                      const isLast = index === lender.loans.length - 1;
                      const classes = [
                        "cursor-pointer",
                        loan.id === selectedLoanId ? "bg-accent/30" : "",
                        isFirst ? "rounded-t-md rounded-b-none" : "",
                        isLast ? "rounded-b-md rounded-t-none" : "",
                        !isFirst && !isLast ? "rounded-none" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <DropdownMenuItem
                          key={loan.id}
                          onSelect={() => handleSelectLoan(loan.id)}
                          className={classes}
                        >
                          <div className="flex flex-col items-start w-full gap-1">
                            <span className="font-medium">
                              {loanT("table.loanNumberShort")} #
                              {loan.loanNumber}
                            </span>
                            <LoanBadges loan={loan} commonT={commonT} />
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Loan Card Display - Render only the selected one */}
              {selectedLoan ? (
                <LoanCard
                  loan={selectedLoan}
                  onEdit={(id) => router.push(`/loans/${id}/edit`)}
                  onDelete={handleDeleteLoan}
                />
              ) : (
                // Optional: Show placeholder if no loan is selected
                <div className="text-center text-muted-foreground py-8">
                  {t("dropdown.selectPrompt")}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lender Information Section - Right side on desktop, top on mobile */}
        <div className="w-full lg:w-1/3 mt-6">
          <h2 className="text-2xl font-semibold mb-4">
            {t("details.lenderInfo")}
          </h2>
          <LenderInfoCard lender={lender} />
        </div>
      </div>
    </div>
  );
}
