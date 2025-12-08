'use client';

import type { File } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileIcon, FileText, Image as ImageIcon, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteFileAction } from '@/actions/files/mutations/delete-file';

import { formatDate } from '@/lib/utils';
import type { LoanWithCalculations } from '@/types/loans';
import { Button } from '../ui/button';
import { ConfirmDialog } from './confirm-dialog';
import { FileDialog } from './file-dialog';

interface FilesProps {
  files: LoanWithCalculations['files'];
  loans?: LoanWithCalculations[];
  loanId?: string;
  lenderId: string;
}

export function Files({ files, loans, loanId, lenderId }: FilesProps) {
  const t = useTranslations('dashboard.files');
  const commonT = useTranslations('common');
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState<string | null>(null);
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
      return <ImageIcon className={`h-8 w-8 ${file.public ? 'text-amber-500' : 'text-blue-500'}`} />;
    }
    if (file.mimeType === 'application/pdf' || file.mimeType.includes('document') || file.mimeType.includes('text')) {
      return <FileText className={`h-8 w-8 ${file.public ? 'text-amber-500' : 'text-blue-500'}`} />;
    }
    return <FileIcon className={`h-8 w-8 ${file.public ? 'text-amber-500' : 'text-blue-500'}`} />;
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
      <div className="mt-6">
        <div className="mt-2 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex overflow-hidden"
              style={{
                backgroundColor: file.public ? 'hsl(48, 100%, 96%)' : 'hsl(210, 100%, 96%)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              {hasThumbnail(file.mimeType) && !imageErrors[file.id] ? (
                <div className="relative w-32 flex-shrink-0">
                  <Image
                    src={`/api/files/${file.id}/thumbnail`}
                    alt={file.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                    onError={() => handleImageError(file.id)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">{commonT('ui.actions.download')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => setIsConfirmOpen(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">{commonT('ui.actions.delete')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`w-32 flex-shrink-0 flex items-center justify-center relative ${file.public ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}
                >
                  {getFileTypeIcon(file)}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">{commonT('ui.actions.download')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">{commonT('ui.actions.delete')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col h-full p-3 flex-1">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{getFileTypeLabel(file.mimeType)}</div>
                    {file.description && <div className="text-xs text-muted-foreground mt-1">{file.description}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3  mt-auto pt-2">
                  {file.loanId && loans && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {commonT('terms.loan')} #{loans.find((loan) => loan.id === file.loanId)?.loanNumber}
                    </div>
                  )}
                  {file.createdAt && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {formatDate(file.createdAt, locale)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">• {file.createdBy.name}</div>
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

          <Button
            variant="outline"
            className="h-full flex flex-col items-center justify-center p-6 border-dashed"
            onClick={() => setIsFileDialogOpen(true)}
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm">{t('add')}</span>
          </Button>
        </div>
      </div>

      <FileDialog
        lenderId={lenderId}
        loanId={loanId}
        loans={loans}
        open={isFileDialogOpen}
        onOpenChange={setIsFileDialogOpen}
      />
    </>
  );
}
