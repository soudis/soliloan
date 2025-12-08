'use client';

import type { Note } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { FileText, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteNoteAction } from '@/actions/notes/mutations/delete-note';
import type { LoanWithCalculations } from '@/types/loans';
import { Button } from '../ui/button';
import { ConfirmDialog } from './confirm-dialog';
import { NoteDialog } from './note-dialog';

interface NotesProps {
  notes: (Note & {
    createdBy: {
      id: string;
      name: string | null;
    };
  })[];
  loans?: LoanWithCalculations[];
  loanId?: string;
  lenderId: string;
}

export function Notes({ notes, loans, loanId, lenderId }: NotesProps) {
  const t = useTranslations('dashboard.notes');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
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
        <div className="mt-2 columns-1 sm:columns-2 gap-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className="relative group rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200 break-inside-avoid mb-6 flex flex-col"
              style={{
                backgroundColor: note.public ? 'hsl(48, 100%, 96%)' : 'hsl(210, 100%, 96%)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-start space-x-3 flex-1">
                <div className={`rounded-full p-1 mt-1 ${note.public ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                  <FileText className={`h-4 w-4 ${note.public ? 'text-amber-500' : 'text-blue-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm whitespace-pre-line">{note.text}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                  onClick={() => setIsConfirmOpen(note.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">{commonT('ui.actions.delete')}</span>
                </Button>
              </div>
              <div className="flex items-center justify-end space-x-2 mt-auto pt-2">
                {note.loanId && loans && (
                  <div className="flex items-center text-xs text-muted-foreground mr-auto">
                    {commonT('terms.loan')} #{loans.find((loan) => loan.id === note.loanId)?.loanNumber}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {format(new Date(note.createdAt), 'PPP', {
                    locale: dateLocale,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">• {note.createdBy.name}</div>
                {note.public ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Unlock className="h-3 w-3 mr-1" />
                    {t('public')}
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground">
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
            className="w-full break-inside-avoid flex flex-col items-center justify-center p-6 border-dashed min-h-[150px]"
            onClick={() => setIsNoteDialogOpen(true)}
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
      />
    </>
  );
}
