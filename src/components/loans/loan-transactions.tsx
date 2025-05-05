"use client";

import { Transaction } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { deleteTransaction } from "@/app/actions/loans";
import { ConfirmDialog } from "@/components/generic/confirm-dialog";
import { formatCurrency } from "@/lib/utils";

import { TransactionDialog } from "./transaction-dialog";
import { Button } from "../ui/button";

interface LoanTransactionsProps {
  loanId: string;
  transactions: Transaction[];
  hideDeleteForInterest?: boolean;
}

export function LoanTransactions({
  loanId,
  transactions,
  hideDeleteForInterest = false,
}: LoanTransactionsProps) {
  const t = useTranslations("dashboard.loans");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "de" ? de : enUS;
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null
  );
  const queryClient = useQueryClient();

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    const toastId = toast.loading(t("transactions.delete.loading"));

    try {
      const result = await deleteTransaction(loanId, transactionToDelete);

      if (result.error) {
        toast.error(t(`transactions.errors.${result.error}`), {
          id: toastId,
        });
      } else {
        toast.success(t("transactions.delete.success"), {
          id: toastId,
        });
        queryClient.invalidateQueries({ queryKey: ["lender"] });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(t("transactions.delete.error"), {
        id: toastId,
      });
    } finally {
      setTransactionToDelete(null);
    }
  };

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "DEPOSIT":
      case "INTEREST":
        return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
      case "INTERESTPAYMENT":
      case "TERMINATION":
        return <ArrowUpIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionIconBackground = (type: Transaction["type"]) => {
    switch (type) {
      case "DEPOSIT":
      case "INTEREST":
        return "bg-green-500/20";
      case "WITHDRAWAL":
      case "INTERESTPAYMENT":
      case "TERMINATION":
        return "bg-blue-500/20";
      default:
        return "bg-gray-500/20";
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="mt-2 space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`rounded-full ${getTransactionIconBackground(transaction.type)} p-1`}
                >
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {commonT(`enums.transaction.type.${transaction.type}`)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(transaction.date), "PPP", {
                      locale: dateLocale,
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="font-medium">
                  {formatCurrency(transaction.amount)}
                </div>
                <div className="w-8 flex justify-end">
                  {(!hideDeleteForInterest ||
                    transaction.type !== "INTEREST") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">
                        {commonT("ui.actions.delete")}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("transactions.noTransactions")}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setIsTransactionDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {commonT("ui.actions.create")}
          </Button>
        </div>
      </div>

      <TransactionDialog
        loanId={loanId}
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={t("transactions.delete.confirmTitle")}
        description={t("transactions.delete.confirmDescription")}
        confirmText={commonT("ui.actions.delete")}
      />
    </>
  );
}
