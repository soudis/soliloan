'use client';

import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogo } from '../../logo-context';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';

export function ImageSettings() {
  const t = useTranslations('templates.editor.components.image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { projectLogo, appLogo } = useLogo();
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const src = String(props.src ?? '');
  const width = String(props.width ?? '100px');
  const useLogoSource = Boolean(props.useLogoSource);
  const isBase64 = src.startsWith('data:');
  const defaultTab = useLogoSource ? 'logo' : isBase64 ? 'upload' : 'url';
  const resolvedLogo = projectLogo || appLogo;
  const hasProjectLogo = Boolean(projectLogo);

  return (
    <div className="space-y-4 p-4">
      <Tabs
        defaultValue={defaultTab}
        onValueChange={(value) => {
          if (value === 'logo' && !useLogoSource) {
            patch({ useLogoSource: true, src: resolvedLogo });
          } else if (value !== 'logo' && useLogoSource) {
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

        <TabsContent value="url" className="mt-3">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="src">
              {t('imageUrl')}
            </label>
            <input
              id="src"
              type="text"
              value={isBase64 || useLogoSource ? '' : src}
              onChange={(event) => patch({ src: event.target.value, useLogoSource: false })}
              placeholder="https://example.com/image.png"
              className="w-full rounded border px-2 py-1 font-mono text-sm"
            />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-3">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="uploadImage">
              {t('uploadImage')}
            </label>
            <input
              ref={fileInputRef}
              id="uploadImage"
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

            {isBase64 && !useLogoSource ? (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded border">
                  {/* biome-ignore lint/a11y/useAltText: preview */}
                  {/** biome-ignore lint/performance/noImgElement: needed */}
                  <img src={src} className="h-auto w-full" />
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      patch({ src: '', useLogoSource: false });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-1 right-1 rounded-full bg-white/80 p-1 shadow-sm hover:bg-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {fileName && <p className="truncate text-xs text-muted-foreground">{fileName}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-4 w-4" />
                {t('clickToUpload')}
              </button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logo" className="mt-3">
          <div className="space-y-3">
            <div className="flex items-center justify-center overflow-hidden rounded border bg-muted p-4">
              {/* biome-ignore lint/a11y/useAltText: preview */}
              {/** biome-ignore lint/performance/noImgElement: needed */}
              <img src={resolvedLogo} className="max-h-24 max-w-full object-contain" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {hasProjectLogo ? t('logoProjectHint') : t('logoAppHint')}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="width">
          {t('width')}
        </label>
        <input
          id="width"
          type="text"
          value={width}
          onChange={(event) => patch({ width: event.target.value })}
          className="w-full rounded border px-2 py-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}
