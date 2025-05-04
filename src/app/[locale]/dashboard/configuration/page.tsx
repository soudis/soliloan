"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import {
  getConfiguration,
  updateConfiguration,
} from "@/app/actions/configuration";
import { ConfigurationForm } from "@/components/configuration/configuration-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useProject } from "@/store/project-context";

import type { ConfigurationFormData } from "@/lib/schemas/configuration";

export default function ConfigurationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { selectedProject, setSelectedProject } = useProject();
  const t = useTranslations("dashboard.configuration");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pathname = usePathname();

  // Fetch configuration data using React Query
  const { data } = useQuery({
    queryKey: ["configuration", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return null;
      console.log("Fetching configuration for project:", selectedProject.id);
      const result = await getConfiguration(selectedProject.id);
      console.log("Configuration result:", result);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return {
        configuration: result.configuration,
        hasHistoricTransactions: result.hasHistoricTransactions,
      };
    },
    enabled: !!selectedProject?.id,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
  });

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (!data) {
    return null;
  }

  const { configuration: configurationData, hasHistoricTransactions } = data;

  const handleSubmit = async (data: ConfigurationFormData) => {
    try {
      setError(null);
      setIsSubmitting(true);
      console.log("Submitting configuration data:", data);

      // Update the configuration using the server action
      const result = await updateConfiguration(selectedProject.id, data);

      if ("error" in result) {
        throw new Error(result.error);
      }

      // Update the project store with the new configuration
      setSelectedProject({
        ...selectedProject,
        configuration: {
          ...result.configuration,
          // Keep undefined values as undefined for the project store
          email: result.configuration.email || null,
          telNo: result.configuration.telNo || null,
          website: result.configuration.website || null,
          street: result.configuration.street || null,
          addon: result.configuration.addon || null,
          zip: result.configuration.zip || null,
          place: result.configuration.place || null,
          country: result.configuration.country || null,
          iban: result.configuration.iban || null,
          bic: result.configuration.bic || null,
          userLanguage: result.configuration.userLanguage || null,
          userTheme: result.configuration.userTheme || null,
          lenderSalutation: result.configuration.lenderSalutation || null,
          lenderCountry: result.configuration.lenderCountry || null,
          lenderNotificationType:
            result.configuration.lenderNotificationType || null,
          lenderMembershipStatus:
            result.configuration.lenderMembershipStatus || null,
          lenderTags: result.configuration.lenderTags || [],
          interestMethod: result.configuration.interestMethod || null,
          altInterestMethods: result.configuration.altInterestMethods || [],
          customLoans: result.configuration.customLoans || false,
          lenderRequiredFields: result.configuration.lenderRequiredFields || [],
          logo: result.configuration.logo || null,
        },
      });

      // Show success message
      toast.success(t("form.success"));
      router.replace(pathname, { scroll: true });
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      toast.error(t("form.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfigurationForm
      title={t("title")}
      submitButtonText={t("form.submit")}
      submittingButtonText={t("form.submitting")}
      cancelButtonText={t("form.cancel")}
      onSubmit={handleSubmit}
      initialData={configurationData || undefined}
      hasHistoricTransactions={hasHistoricTransactions}
      isLoading={isSubmitting}
      error={error}
    />
  );
}
