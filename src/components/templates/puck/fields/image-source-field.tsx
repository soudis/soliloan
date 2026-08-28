'use client';

import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogo } from '../../logo-context';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

export function ImageSourceField() {
  const t = useTranslations('templates.editor.components.image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { projectLogo, appLogo } = useLogo();
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const src = String(props.src ?? '');
  const useLogoSource = Boolean(props.useLogoSource);

  const isBase64 = src.startsWith('data:');
  const defaultTab = useLogoSource ? 'logo' : isBase64 ? 'upload' : 'url';
  const resolvedLogo = projectLogo || appLogo;

  return (
    <div className="space-y-3 px-4 py-3">
      <Tabs
        defaultValue={defaultTab}
        onValueChange={(val) => {
          if (val === 'logo') {
            patch({ useLogoSource: true, src: resolvedLogo });
          } else if (useLogoSource) {
            patch({ useLogoSource: false, src: '' });
          }
        }}
      >
        <TabsList variant="modern" className="mt-0">
          <TabsTrigger variant="modern" size="sm" value="url">
            {t('tabUrl')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="upload">
            {t('tabUpload')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="logo">
            {t('tabLogo')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-3 space-y-2">
          <label className="text-xs font-medium" htmlFor="puckImageSrc">
            {t('imageUrl')}
          </label>
          <input
            id="puckImageSrc"
            type="text"
            value={useLogoSource ? '' : src}
            onChange={(event) => patch({ src: event.target.value, useLogoSource: false })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-3 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (loadEvent) => {
                const result = loadEvent.target?.result;
                if (typeof result === 'string') {
                  setFileName(file.name);
                  patch({ src: result, useLogoSource: false });
                }
              };
              reader.readAsDataURL(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 py-6 text-xs text-muted-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            {fileName || t('clickToUpload')}
          </button>
          {isBase64 && (
            <button
              type="button"
              onClick={() => {
                setFileName(null);
                patch({ src: '', useLogoSource: false });
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <X className="h-3 w-3" />
              {t('uploadImage')}
            </button>
          )}
        </TabsContent>

        <TabsContent value="logo" className="mt-3 text-xs text-muted-foreground">
          {projectLogo ? t('logoProjectHint') : t('logoAppHint')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
