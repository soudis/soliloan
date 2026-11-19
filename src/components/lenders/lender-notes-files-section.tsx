'use client';

import { Files as FilesIcon, NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { withoutLoan } from '@/lib/utils/lender-notes-files';
import type { LenderDetailsWithCalculations } from '@/types/lenders';
import { Files } from '../generic/files';
import { Notes } from '../generic/notes';
import { AddTypeButton } from './add-entity-menu';

interface LenderNotesFilesSectionProps {
  lender: LenderDetailsWithCalculations;
  onAddNote: () => void;
  onAddFile: () => void;
}

export function LenderNotesFilesSection({ lender, onAddNote, onAddFile }: LenderNotesFilesSectionProps) {
  const t = useTranslations('dashboard.lenders.lenderPage');
  const notesT = useTranslations('dashboard.notes');
  const filesT = useTranslations('dashboard.files');
  const notes = withoutLoan(lender.notes);
  const files = withoutLoan(lender.files);

  return (
    <div id="notes-files" className="scroll-mt-24 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('sections.notes')}
              {notes.length > 0 && <span className="ml-1.5 text-xs">({notes.length})</span>}
            </h3>
          </div>
          <AddTypeButton label={notesT('text')} onClick={onAddNote} />
        </div>
        <Notes notes={notes} lenderId={lender.id} loans={lender.loans} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FilesIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('sections.files')}
              {files.length > 0 && <span className="ml-1.5 text-xs">({files.length})</span>}
            </h3>
          </div>
          <AddTypeButton label={filesT('file')} onClick={onAddFile} />
        </div>
        <Files lenderId={lender.id} loans={lender.loans} files={files} />
      </div>
    </div>
  );
}
