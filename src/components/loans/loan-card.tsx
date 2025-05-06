"use client";

import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/components/generic/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InfoItem } from "@/components/ui/info-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoanTabsStore } from "@/lib/stores/loan-tabs-store";
import { formatCurrency } from "@/lib/utils";
import { LoanStatus, LoanWithCalculations } from "@/types/loans";

import { LoanCalculations } from "./loan-calculations";
import { LoanFiles } from "./loan-files";
import { LoanNotes } from "./loan-notes";
import { LoanTransactions } from "./loan-transactions";
import { Button } from "../ui/button";

interface LoanCardProps {
  loan: LoanWithCalculations;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function LoanCard({ loan, onEdit, onDelete, className }: LoanCardProps) {
  const t = useTranslations("dashboard.loans");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "de" ? de : enUS;
  const { getActiveTab, setActiveTab } = useLoanTabsStore();
  const activeTab = getActiveTab(loan.id);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const getTerminationModalities = () => {
    switch (loan.terminationType) {
      case "ENDDATE":
        return `${commonT("enums.loan.terminationType.ENDDATE")} - ${loan.endDate ? format(new Date(loan.endDate), "PPP", { locale: dateLocale }) : "-"}`;
      case "TERMINATION":
        if (!loan.terminationPeriod || !loan.terminationPeriodType)
          return `${commonT("enums.loan.terminationType.TERMINATION")} - -`;
        return `${commonT("enums.loan.terminationType.TERMINATION")} - ${loan.terminationPeriod} ${
          loan.terminationPeriodType === "MONTHS"
            ? commonT("enums.loan.durationUnit.MONTHS")
            : commonT("enums.loan.durationUnit.YEARS")
        }`;
      case "DURATION":
        if (!loan.duration || !loan.durationType)
          return `${commonT("enums.loan.terminationType.DURATION")} - -`;
        return `${commonT("enums.loan.terminationType.DURATION")} - ${loan.duration} ${
          loan.durationType === "MONTHS"
            ? commonT("enums.loan.durationUnit.MONTHS")
            : commonT("enums.loan.durationUnit.YEARS")
        }`;
      default:
        return "-";
    }
  };

  const handleDeleteClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(loan.id);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {t("table.loanNumber")} #{loan.loanNumber}
            </h3>
            <div className="flex space-x-2">
              <Badge
                variant={
                  loan.contractStatus === "PENDING" ? "secondary" : "default"
                }
                className="mt-1"
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
                className="mt-1"
              >
                {commonT(`enums.loan.status.${loan.status}`)}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-1">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(loan.id)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {commonT("ui.actions.edit")}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                className="text-destructive hover:text-destructive/90 border-destructive/50 hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {commonT("ui.actions.delete")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              label={t("table.amount")}
              value={formatCurrency(loan.amount)}
            />
            <InfoItem
              label={t("table.interestRate")}
              value={`${loan.interestRate} %`}
            />
            <InfoItem
              label={t("table.signDate")}
              value={format(new Date(loan.signDate), "PPP", {
                locale: dateLocale,
              })}
            />
            <InfoItem
              label={t("table.terminationModalities")}
              value={getTerminationModalities()}
            />
          </div>
          <LoanCalculations
            className="mt-6"
            deposits={loan.deposits}
            withdrawals={loan.withdrawals}
            notReclaimed={loan.notReclaimed}
            interest={loan.interest}
            interestPaid={loan.interestPaid}
            interestError={loan.interestError}
            balance={loan.balance}
          />
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(
                loan.id,
                value as "transactions" | "files" | "notes" | "bookings"
              )
            }
            className="mt-6"
          >
            <TabsList className="w-full border-b border-border bg-transparent p-0 mt-4 flex justify-start gap-0">
              <TabsTrigger
                value="transactions"
                className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2 text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
              >
                {t("table.transactions")}
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2 text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
              >
                {t("table.bookings")}
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2   text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
              >
                {t("table.files")}
                {loan.files && loan.files.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {loan.files.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent px-6 pt-1 pb-2  text-lg data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none cursor-pointer"
              >
                {t("table.notes")}
                {loan.notes && loan.notes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {loan.notes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
              <LoanTransactions
                loanId={loan.id}
                transactions={loan.transactions.filter(
                  (t) => t.type !== "INTEREST"
                )}
                loan={loan}
              />
            </TabsContent>
            <TabsContent value="bookings">
              <LoanTransactions
                loanId={loan.id}
                transactions={loan.transactions}
                loan={loan}
              />
            </TabsContent>
            <TabsContent value="files">
              <LoanFiles loanId={loan.id} files={loan.files} />
            </TabsContent>
            <TabsContent value="notes">
              <LoanNotes loanId={loan.id} notes={loan.notes} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={t("delete.confirmTitle")}
        description={t("delete.confirmDescription")}
        confirmText={commonT("ui.actions.delete")}
      />
    </>
  );
}
