'use client';

import { Files as FilesIcon, NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { Files } from '../generic/files';
import { Notes } from '../generic/notes';
import { AddTypeButton } from './add-entity-menu';

interface LoanNotesFilesSectionProps {
  loan: LoanDetailsWithCalculations;
  onAddNote: () => void;
  onAddFile: () => void;
}

export function LoanNotesFilesSection({ loan, onAddNote, onAddFile }: LoanNotesFilesSectionProps) {
  const t = useTranslations('dashboard.loans');
  const notesT = useTranslations('dashboard.notes');
  const filesT = useTranslations('dashboard.files');

  return (
    <div id={`loan-notes-files-${loan.id}`} className="scroll-mt-24 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('table.notes')}
              {loan.notes.length > 0 && <span className="ml-1.5 text-xs">({loan.notes.length})</span>}
            </h3>
          </div>
          <AddTypeButton label={notesT('text')} onClick={onAddNote} />
        </div>
        <Notes notes={loan.notes} lenderId={loan.lender.id} loanId={loan.id} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FilesIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('table.files')}
              {loan.files.length > 0 && <span className="ml-1.5 text-xs">({loan.files.length})</span>}
            </h3>
          </div>
          <AddTypeButton label={filesT('file')} onClick={onAddFile} />
        </div>
        <Files files={loan.files} lenderId={loan.lender.id} loanId={loan.id} />
      </div>
    </div>
  );
}
