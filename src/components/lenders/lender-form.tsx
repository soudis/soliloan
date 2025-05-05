"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LenderRequiredField, LenderType } from "@prisma/client";
import { useForm } from "react-hook-form";

import { Form } from "@/components/ui/form";
import { FormActions } from "@/components/ui/form-actions";
import { FormLayout } from "@/components/ui/form-layout";
import {
  validateAddressOptional,
  validateAddressRequired,
  validateFieldRequired,
} from "@/lib/schemas/common";
import { lenderFormSchema } from "@/lib/schemas/lender";
import { useProject } from "@/store/project-context";

import { LenderFormFields } from "./lender-form-fields";

import type { LenderFormData } from "@/lib/schemas/lender";
import type { LenderWithRelations } from "@/types/lenders";

interface LenderFormProps {
  title: string;
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  onSubmit: (data: LenderFormData) => Promise<void>;
  initialData?: Partial<LenderWithRelations>;
  isLoading?: boolean;
  error?: string | null;
}

export function LenderForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  isLoading,
  error,
}: LenderFormProps) {
  const { selectedProject } = useProject();

  const initialType = initialData?.type || LenderType.PERSON;
  const defaultValues = {
    type: initialType,
    salutation:
      initialData?.salutation ||
      selectedProject?.configuration?.lenderSalutation ||
      "",
    notificationType:
      initialData?.notificationType ||
      selectedProject?.configuration?.lenderNotificationType ||
      "",
    membershipStatus:
      initialData?.membershipStatus ||
      selectedProject?.configuration?.lenderMembershipStatus ||
      "",
    projectId: selectedProject?.id || "",
    // Contact Information
    email: initialData?.email || "",
    telNo: initialData?.telNo || "",
    // Address Information
    street: initialData?.street || "",
    addon: initialData?.addon || "",
    zip: initialData?.zip || "",
    place: initialData?.place || "",
    country:
      initialData?.country ||
      selectedProject?.configuration?.lenderCountry ||
      "",
    // Banking Information
    iban: initialData?.iban || "",
    bic: initialData?.bic || "",
    // Additional Information
    tag: initialData?.tag || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    titlePrefix: initialData?.titlePrefix || "",
    titleSuffix: initialData?.titleSuffix || "",
    organisationName: "",
    // Include any other fields from initialData that might not be explicitly handled
  };

  let schema;
  schema = lenderFormSchema;

  if (
    selectedProject?.configuration?.lenderRequiredFields.includes(
      LenderRequiredField.address
    )
  ) {
    schema = schema.superRefine(validateAddressRequired);
  } else {
    schema = schema.superRefine(validateAddressOptional);
  }
  if (
    selectedProject?.configuration?.lenderRequiredFields.includes(
      LenderRequiredField.email
    )
  ) {
    schema = schema.superRefine(validateFieldRequired("email"));
  }
  if (
    selectedProject?.configuration?.lenderRequiredFields.includes(
      LenderRequiredField.telNo
    )
  ) {
    schema = schema.superRefine(validateFieldRequired("telNo"));
  }

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  if (!selectedProject) {
    return null;
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  });

  return (
    <FormLayout title={title} error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <LenderFormFields />

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
