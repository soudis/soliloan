"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { addFile } from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { fileSchema } from "@/lib/schemas/file";

import { FileFormFields } from "./file-form-fields";

import type { FileFormData } from "@/lib/schemas/file";

interface FileDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileDialog({ loanId, open, onOpenChange }: FileDialogProps) {
  const t = useTranslations("dashboard.files");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();

  const form = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
    defaultValues: {
      name: "",
      description: "",
      public: false,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Get the file from the form
      const fileInput = document.getElementById("file") as HTMLInputElement;
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        toast.error(t("noFileSelected"));
        return;
      }

      const file = fileInput.files[0];

      // Read the file as ArrayBuffer and convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const result = await addFile(loanId, data, base64Data, file.type);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success(t("createSuccess"));
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["lender"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    } catch (error) {
      console.error("Error creating file:", error);
      toast.error(t("createError"));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FileFormFields />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {commonT("ui.actions.cancel")}
              </Button>
              <Button type="submit">{commonT("ui.actions.create")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
