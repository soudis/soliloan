'use client';

import type { Note } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteNoteAction } from '@/actions/notes/mutations/delete-note';
import { cn, formatDateLong } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { Button } from '../ui/button';
import { ConfirmDialog } from './confirm-dialog';
import { LoanReferenceLink } from './loan-reference-link';
import { NoteDialog } from './note-dialog';
import { NoteRichTextRenderer } from './notes/note-rich-text-renderer';

interface NotesProps {
  notes: (Note & {
    createdBy: {
      id: string;
      name: string | null;
    };
  })[];
  loans?: LoanDetailsWithCalculations[];
  loanId?: string;
  lenderId: string;
}

export function Notes({ notes, loans, loanId, lenderId }: NotesProps) {
  const t = useTranslations('dashboard.notes');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<
    (Note & { createdBy: { id: string; name: string | null } }) | undefined
  >(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDeleteNote = async (noteId: string) => {
    setIsConfirmOpen(null);
    const result = await deleteNoteAction({ noteId });
    if (result?.serverError || result?.validationErrors) {
      console.error('Error deleting note:', result.serverError);
      toast.error(t('deleteError'));
    } else {
      toast.success(t('deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['lender'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="mt-2 columns-1 gap-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'relative group min-h-[120px] break-inside-avoid mb-4 flex flex-col rounded-sm border border-border p-4',
                'transition-colors duration-200',
                note.public
                  ? 'bg-warning/30 border-warning/20 text-warning-foreground'
                  : 'bg-info/20 border-info/20 text-info-foreground',
              )}
            >
              <div className="flex-1 min-w-0 pr-6 leading-snug">
                <NoteRichTextRenderer content={note.text} />
              </div>

              <div className="absolute top-2 right-2 flex space-x-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    note.public ? 'bg-warning/10 hover:bg-warning/20' : 'bg-info/10 hover:bg-info/20',
                  )}
                  onClick={() => {
                    setEditingNote(note);
                    setIsNoteDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">{commonT('ui.actions.edit')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    note.public ? 'bg-warning/10 hover:bg-warning/20' : 'bg-info/10 hover:bg-info/20',
                  )}
                  onClick={() => setIsConfirmOpen(note.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">{commonT('ui.actions.delete')}</span>
                </Button>
              </div>

              <div
                className={cn(
                  'mt-3 flex items-center justify-end space-x-2 border-t pt-2 text-xs',
                  note.public ? 'border-amber-900/10 text-amber-900/70' : 'border-sky-900/10 text-sky-900/70',
                )}
              >
                {note.loanId && loans && (
                  <LoanReferenceLink
                    loanId={note.loanId}
                    loanNumber={loans.find((loan) => loan.id === note.loanId)?.loanNumber}
                    className="mr-auto"
                  />
                )}
                <div>{formatDateLong(note.createdAt, locale)}</div>
                <div>{note.createdBy.name}</div>
                <div>•</div>

                {note.public ? (
                  <div className="flex items-center">
                    <Unlock className="h-3 w-3 mr-1" />
                    {t('public')}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    {t('private')}
                  </div>
                )}
              </div>

              <ConfirmDialog
                open={isConfirmOpen === note.id}
                onOpenChange={(open) => setIsConfirmOpen(open ? note.id : null)}
                onConfirm={() => handleDeleteNote(note.id)}
                title={t('delete')}
                description={t('deleteConfirm')}
                confirmText={commonT('ui.actions.delete')}
              />
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed py-6"
            onClick={() => {
              setEditingNote(undefined);
              setIsNoteDialogOpen(true);
            }}
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm">{t('add')}</span>
          </Button>
        </div>
      </div>

      <NoteDialog
        lenderId={lenderId}
        loanId={loanId}
        loans={loans}
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        note={editingNote}
      />
    </>
  );
}
