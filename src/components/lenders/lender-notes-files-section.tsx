'use client';

import { Files as FilesIcon, NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LenderDetailsWithCalculations } from '@/types/lenders';
import { Files } from '../generic/files';
import { Notes } from '../generic/notes';

interface LenderNotesFilesSectionProps {
  lender: LenderDetailsWithCalculations;
}

export function LenderNotesFilesSection({ lender }: LenderNotesFilesSectionProps) {
  const t = useTranslations('dashboard.lenders.lenderPage');

  return (
    <div id="notes-files" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <NotebookPen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('sections.notes')}
            {lender.allNotes.length > 0 && <span className="ml-1.5 text-xs">({lender.allNotes.length})</span>}
          </h3>
        </div>
        <Notes notes={lender.allNotes} lenderId={lender.id} loans={lender.loans} />
      </div>

      {/* Files */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FilesIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('sections.files')}
            {lender.allFiles.length > 0 && <span className="ml-1.5 text-xs">({lender.allFiles.length})</span>}
          </h3>
        </div>
        <Files lenderId={lender.id} loans={lender.loans} files={lender.allFiles} />
      </div>
    </div>
  );
}
