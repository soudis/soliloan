"use client";

import { Note } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { FileText, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { deleteNote } from "@/app/actions/notes";

import { NoteDialog } from "./note-dialog";
import { Button } from "../ui/button";

interface LoanNotesProps {
  loanId: string;
  notes: (Note & {
    createdBy: {
      id: string;
      name: string;
    };
  })[];
}

export function LoanNotes({ loanId, notes }: LoanNotesProps) {
  const t = useTranslations("dashboard.notes");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "de" ? de : enUS;
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await deleteNote(loanId, noteId);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["lender"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error(t("deleteError"));
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
          {notes.map((note) => (
            <div
              key={note.id}
              className="relative group rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200 h-full"
              style={{
                backgroundColor: note.public
                  ? "hsl(48, 100%, 96%)"
                  : "hsl(210, 100%, 96%)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start space-x-3">
                  <div
                    className={`rounded-full p-1 mt-1 ${note.public ? "bg-amber-500/20" : "bg-blue-500/20"}`}
                  >
                    <FileText
                      className={`h-4 w-4 ${note.public ? "text-amber-500" : "text-blue-500"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm whitespace-pre-line">
                      {note.text}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">
                      {commonT("ui.actions.delete")}
                    </span>
                  </Button>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-auto pt-2">
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), "PPP", {
                      locale: dateLocale,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    • {note.createdBy.name}
                  </div>
                  {note.public ? (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Unlock className="h-3 w-3 mr-1" />
                      {t("public")}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1" />
                      {t("private")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="h-full flex flex-col items-center justify-center p-6 border-dashed"
            onClick={() => setIsNoteDialogOpen(true)}
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm">{commonT("ui.actions.create")}</span>
          </Button>
        </div>
      </div>

      <NoteDialog
        loanId={loanId}
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
      />
    </>
  );
}
