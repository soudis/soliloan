'use client';

import type { File } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileIcon, FileText, Image as ImageIcon, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteFileAction } from '@/actions/files/mutations/delete-file';

import { cn, formatDateLong } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { Button } from '../ui/button';
import { ConfirmDialog } from './confirm-dialog';
import { FileDialog } from './file-dialog';
import { LoanReferenceLink } from './loan-reference-link';

interface FilesProps {
  files: LoanDetailsWithCalculations['files'];
  loans?: LoanDetailsWithCalculations[];
  loanId?: string;
  lenderId: string;
}

export function Files({ files, loans, loanId, lenderId }: FilesProps) {
  const t = useTranslations('dashboard.files');
  const commonT = useTranslations('common');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState<string | null>(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<LoanDetailsWithCalculations['files'][number] | undefined>(undefined);
  const queryClient = useQueryClient();
  const locale = useLocale();

  const handleDeleteFile = async (fileId: string) => {
    setIsConfirmOpen(null);
    const result = await deleteFileAction({ fileId });
    if (result?.serverError || result?.validationErrors) {
      console.error('Error deleting file:', result.serverError);
      toast.error(t('deleteError'));
    } else {
      toast.success(t('deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['lender', lenderId] });
    }
  };

  const handleDownloadFile = async (file: Omit<File, 'data'>) => {
    try {
      const response = await fetch(`/api/files/${file.id}`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);

      // Create a temporary link element
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;

      // Append the link to the body, click it, and remove it
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke the URL to free up memory
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(t('downloadError'));
    }
  };

  const hasThumbnail = (mimeType: string) => mimeType.startsWith('image/') || mimeType === 'application/pdf';

  const getFileTypeIcon = (file: Omit<File, 'data'>) => {
    if (file.mimeType.startsWith('image/')) {
      return <ImageIcon className={`h-8 w-8 ${file.public ? 'text-warning-foreground' : 'text-info-foreground'}`} />;
    }
    if (file.mimeType === 'application/pdf' || file.mimeType.includes('document') || file.mimeType.includes('text')) {
      return <FileText className={`h-8 w-8 ${file.public ? 'text-warning-foreground' : 'text-info-foreground'}`} />;
    }
    return <FileIcon className={`h-8 w-8 ${file.public ? 'text-warning-foreground' : 'text-info-foreground'}`} />;
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return 'Image';
    }
    if (mimeType === 'application/pdf') {
      return 'PDF';
    }
    if (mimeType.includes('document') || mimeType.includes('text')) {
      return 'Document';
    }
    return 'File';
  };

  const handleImageError = (fileId: string) => {
    setImageErrors((prev) => ({ ...prev, [fileId]: true }));
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {files.length === 0 && <p className="text-sm text-muted-foreground">{t('noFiles')}</p>}
        <div className="grid grid-cols-1 gap-4 auto-rows-fr">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'group relative flex h-full min-h-[120px] overflow-hidden rounded-lg border shadow-none transition-all duration-200',
                'cursor-pointer hover:shadow-md',
                file.public
                  ? 'border-warning/25 bg-[color-mix(in_oklch,var(--warning)_15%,var(--background))] hover:border-warning/70 hover:bg-[color-mix(in_oklch,var(--warning)_32%,var(--background))]'
                  : 'border-info/25 bg-[color-mix(in_oklch,var(--info)_15%,var(--background))] hover:border-info/70 hover:bg-[color-mix(in_oklch,var(--info)_32%,var(--background))]',
              )}
            >
              <a
                href={`/api/files/${file.id}?inline=1`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('open', { name: file.name })}
                className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="sr-only">{t('open', { name: file.name })}</span>
              </a>
              <div
                className={cn(
                  'pointer-events-none relative flex w-32 min-h-[120px] shrink-0 items-center justify-center self-stretch overflow-hidden',
                  file.public ? 'bg-warning/25' : 'bg-info/25',
                )}
              >
                <span className="transition duration-200 group-hover:scale-110">{getFileTypeIcon(file)}</span>
                {hasThumbnail(file.mimeType) && file.thumbnail && !imageErrors[file.id] ? (
                  /** biome-ignore lint/performance/noImgElement: needed */
                  <img
                    src={`/api/files/${file.id}/thumbnail`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    onError={() => handleImageError(file.id)}
                  />
                ) : null}
                <span className="absolute inset-0 bg-foreground/0 transition duration-200 group-hover:bg-foreground/25" />
              </div>

              <div className="absolute top-2 right-2 z-10 flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleDownloadFile(file)}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">{commonT('ui.actions.download')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    setEditingFile(file);
                    setIsFileDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">{commonT('ui.actions.edit')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setIsConfirmOpen(file.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{commonT('ui.actions.delete')}</span>
                </Button>
              </div>
              <div className="pointer-events-none relative z-0 flex h-full flex-1 flex-col p-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{getFileTypeLabel(file.mimeType)}</div>
                    {file.description && <div className="text-xs text-muted-foreground mt-1">{file.description}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3  mt-auto pt-2">
                  {file.loanId && loans && (
                    <LoanReferenceLink
                      loanId={file.loanId}
                      loanNumber={loans.find((loan) => loan.id === file.loanId)?.loanNumber}
                      className="pointer-events-auto relative z-10 mr-auto"
                    />
                  )}

                  {file.createdAt && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {formatDateLong(file.createdAt, locale)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{file.createdBy.name}</div>
                  <div className="text-xs text-muted-foreground">•</div>
                  {file.public ? (
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
              </div>

              <ConfirmDialog
                open={isConfirmOpen === file.id}
                onOpenChange={(open) => setIsConfirmOpen(open ? file.id : null)}
                onConfirm={() => handleDeleteFile(file.id)}
                title={t('delete.confirmTitle')}
                description={t('delete.confirmDescription', { name: file.name })}
                confirmText={commonT('ui.actions.delete')}
              />
            </div>
          ))}
        </div>
      </div>
      <FileDialog
        lenderId={lenderId}
        loanId={loanId}
        loans={loans}
        open={isFileDialogOpen}
        onOpenChange={setIsFileDialogOpen}
        file={editingFile}
      />
    </>
  );
}
