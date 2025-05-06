"use client";

import { ChevronDown } from "lucide-react";

import { getLenderById } from "@/app/actions/lenders"; // Adjust if type can be imported more directly
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanStatus } from "@/types/loans";

// Define LoanBadges locally or import if it's made a shared component
const LoanBadges = ({
  loan,
  commonT,
}: {
  loan: {
    contractStatus: string;
    status: string;
    loanNumber: number;
    id: string;
  }; // Corrected loanNumber type
  commonT: (key: string) => string;
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

type LoanInSelector = NonNullable<
  Awaited<ReturnType<typeof getLenderById>>["lender"]
>["loans"][0];

interface LoanSelectorProps {
  loans: LoanInSelector[];
  selectedLoanId?: string;
  onSelectLoan: (loanId: string) => void;
  maxTabs: number;
  commonT: (key: string) => string; // Consider more specific type if available
  loanT: (key: string) => string; // Consider more specific type if available
}

export function LoanSelector({
  loans,
  selectedLoanId,
  onSelectLoan,
  maxTabs,
  commonT,
  loanT,
}: LoanSelectorProps) {
  const showTabs = loans.length <= maxTabs;
  const selectedLoan = loans.find((loan) => loan.id === selectedLoanId);

  if (loans.length === 0) {
    return null; // Or some placeholder if needed, parent handles "noLoans" message
  }

  return (
    <>
      {showTabs ? (
        <Tabs
          value={selectedLoanId}
          onValueChange={onSelectLoan}
          className="w-full"
        >
          <TabsList className="px-2.5 flex flex-row flex-wrap justify-start gap-2 h-auto bg-transparent mb-0">
            {loans.map((loan) => (
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
          {/* The selected LoanCard will be rendered by the parent component */}
        </Tabs>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="relative flex items-center justify-between hover:bg-accent/20 h-auto rounded-none p-2 mb-0 mx-2.5 text-foreground shadow-none border-0 border-b-2 border-primary cursor-pointer bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
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
            {loans.map((loan, index) => {
              const isFirst = index === 0;
              const isLast = index === loans.length - 1;
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
                  onSelect={() => onSelectLoan(loan.id)}
                  className={classes}
                >
                  <div className="flex flex-col items-start w-full gap-1">
                    <span className="font-medium">
                      {loanT("table.loanNumberShort")} #{loan.loanNumber}
                    </span>
                    <LoanBadges loan={loan} commonT={commonT} />
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
