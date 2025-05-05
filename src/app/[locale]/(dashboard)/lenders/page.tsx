"use client";

import {
  Lender,
  MembershipStatus,
  NotificationType,
  Salutation,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { getLendersByProjectId } from "@/app/actions/lenders";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/navigation";
import {
  createColumn,
  createLenderAddressColumn,
  createLenderBankingColumn,
  createLenderEnumBadgeColumn,
  createLenderNameColumn,
} from "@/lib/table-column-utils";
import { useProject } from "@/store/project-context";

export default function LendersPage() {
  const router = useRouter();
  const { selectedProject } = useProject();
  const t = useTranslations("dashboard.lenders");
  const commonT = useTranslations("common");

  const { data: lenders = [], isLoading: loading } = useQuery({
    queryKey: ["lenders", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const result = await getLendersByProjectId(selectedProject.id);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.lenders;
    },
    enabled: !!selectedProject,
  });

  const columns: ColumnDef<Lender>[] = [
    createColumn<Lender>(
      {
        accessorKey: "lenderNumber",
        header: "table.lenderNumber",
      },
      t
    ),

    createLenderNameColumn<Lender>(t),

    createLenderEnumBadgeColumn<Lender>(
      "type",
      "table.type",
      "enums.lender.type",
      t,
      commonT,
      () => "outline"
    ),

    createColumn<Lender>(
      {
        accessorKey: "email",
        header: "table.email",
      },
      t
    ),

    createColumn<Lender>(
      {
        accessorKey: "telNo",
        header: "table.telNo",
      },
      t
    ),

    createLenderAddressColumn<Lender>(t),

    createLenderBankingColumn<Lender>(t),

    createLenderEnumBadgeColumn<Lender>(
      "notificationType",
      "table.notificationType",
      "enums.lender.notificationType",
      t,
      commonT,
      () => "outline"
    ),

    createLenderEnumBadgeColumn<Lender>(
      "membershipStatus",
      "table.membershipStatus",
      "enums.lender.membershipStatus",
      t,
      commonT,
      () => "outline"
    ),

    createColumn<Lender>(
      {
        accessorKey: "tag",
        header: "table.tag",
      },
      t
    ),

    createLenderEnumBadgeColumn<Lender>(
      "salutation",
      "table.salutation",
      "enums.lender.salutation",
      t,
      commonT,
      () => "outline"
    ),
  ];

  // Define column filters based on data types
  const columnFilters = {
    lenderNumber: {
      type: "number" as const,
      label: t("table.lenderNumber"),
    },
    type: {
      type: "select" as const,
      label: t("table.type"),
      options: [
        { label: commonT("enums.lender.type.PERSON"), value: "PERSON" },
        {
          label: commonT("enums.lender.type.ORGANISATION"),
          value: "ORGANISATION",
        },
      ],
    },
    name: {
      type: "text" as const,
      label: t("table.name"),
    },
    email: {
      type: "text" as const,
      label: t("table.email"),
    },
    telNo: {
      type: "text" as const,
      label: t("table.telNo"),
    },
    address: {
      type: "text" as const,
      label: t("table.address"),
    },
    banking: {
      type: "text" as const,
      label: t("table.banking"),
    },
    notificationType: {
      type: "select" as const,
      label: t("table.notificationType"),
      options: Object.entries(NotificationType).map(([key, value]) => ({
        label: commonT(`enums.lender.notificationType.${key}`),
        value: value,
      })),
    },
    membershipStatus: {
      type: "select" as const,
      label: t("table.membershipStatus"),
      options: Object.entries(MembershipStatus).map(([key, value]) => ({
        label: commonT(`enums.lender.membershipStatus.${key}`),
        value: value,
      })),
    },
    tag: {
      type: "text" as const,
      label: t("table.tag"),
    },
    salutation: {
      type: "select" as const,
      label: t("table.salutation"),
      options: Object.entries(Salutation).map(([key, value]) => ({
        label: commonT(`enums.lender.salutation.${key}`),
        value: value,
      })),
    },
  };

  // Define default column visibility
  const defaultColumnVisibility = {
    lenderNumber: true,
    type: true,
    name: true,
    email: true,
    telNo: true,
    address: false,
    banking: false,
    notificationType: true,
    membershipStatus: true,
    tag: true,
    salutation: false,
  };

  if (!selectedProject) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Button onClick={() => router.push("/lenders/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("new.title")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={lenders}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType="LENDER"
        showFilter={true}
        onRowClick={(row) => router.push(`/lenders/${row.id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/loans/new?lenderId=${row.id}`);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">
                      {commonT("ui.actions.createLoan")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commonT("ui.actions.createLoan")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/lenders/${row.id}/edit`);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">
                      {commonT("ui.actions.edit")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commonT("ui.actions.edit")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      />
    </div>
  );
}
