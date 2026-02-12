'use client';

import { useNode } from '@craftjs/core';
import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogo } from '../logo-context';

interface ImageProps {
  src: string;
  width?: string;
  /** Whether this image uses the project/app logo */
  useLogoSource?: boolean;
}

export const Image = ({
  src = 'https://via.placeholder.com/150',
  width = '100%',
  useLogoSource = false,
}: ImageProps) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { projectLogo, appLogo } = useLogo();

  // Resolve the actual image source
  const resolvedSrc = useLogoSource ? (projectLogo || appLogo) : src;

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(drag(dom));
        }
      }}
      className={`my-2 inline-block ${selected ? 'outline-1 outline-blue-500' : ''}`}
      style={{ width }}
    >
      {/* biome-ignore lint/a11y/useAltText: needed */}
      <img src={resolvedSrc} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
};

export const ImageSettings = () => {
  const t = useTranslations('templates.editor.components.image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { projectLogo, appLogo } = useLogo();

  const {
    actions: { setProp },
    src,
    width,
    useLogoSource,
  } = useNode((node) => ({
    src: node.data.props.src,
    width: node.data.props.width,
    useLogoSource: node.data.props.useLogoSource ?? false,
  }));

  const isBase64 = src?.startsWith('data:');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64String = event.target.result as string;
          setProp((props: ImageProps) => {
            props.src = base64String;
            props.useLogoSource = false;
          });
          setFileName(file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveUpload = () => {
    setProp((props: ImageProps) => {
      props.src = 'https://via.placeholder.com/150';
      props.useLogoSource = false;
    });
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectLogo = () => {
    setProp((props: ImageProps) => {
      props.useLogoSource = true;
      // Store the resolved logo as src so it serializes for email generation
      props.src = projectLogo || appLogo;
    });
  };

  const handleDeselectLogo = () => {
    setProp((props: ImageProps) => {
      props.useLogoSource = false;
      props.src = 'https://via.placeholder.com/150';
    });
  };

  const defaultTab = useLogoSource ? 'logo' : isBase64 ? 'upload' : 'url';

  const resolvedLogo = projectLogo || appLogo;
  const hasProjectLogo = !!projectLogo;

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue={defaultTab} onValueChange={(val) => {
        // When switching away from logo tab, disable logo source
        if (val !== 'logo' && useLogoSource) {
          handleDeselectLogo();
        }
        // When switching to logo tab, enable logo source
        if (val === 'logo' && !useLogoSource) {
          handleSelectLogo();
        }
      }}>
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
              type="text"
              value={isBase64 || useLogoSource ? '' : src}
              onChange={(e) =>
                setProp((props: ImageProps) => {
                  props.src = e.target.value;
                  props.useLogoSource = false;
                })
              }
              placeholder="https://example.com/image.png"
              className="w-full px-2 py-1 border rounded text-sm font-mono"
            />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-3">
          <div className="space-y-2">
            <label className="text-xs font-medium">{t('uploadImage')}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />

            {isBase64 && !useLogoSource ? (
              <div className="space-y-2">
                <div className="relative border rounded overflow-hidden">
                  {/* biome-ignore lint/a11y/useAltText: preview */}
                  <img src={src} className="w-full h-auto" />
                  <button
                    type="button"
                    onClick={handleRemoveUpload}
                    className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white rounded-full shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {fileName && (
                  <p className="text-xs text-muted-foreground truncate">{fileName}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-4 border-2 border-dashed rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {t('clickToUpload')}
              </button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logo" className="mt-3">
          <div className="space-y-3">
            <div className="border rounded overflow-hidden bg-zinc-50 p-4 flex items-center justify-center">
              {/* biome-ignore lint/a11y/useAltText: preview */}
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
          type="text"
          value={width}
          onChange={(e) =>
            setProp((props: ImageProps) => {
              props.width = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm font-mono"
        />
      </div>
    </div>
  );
};

Image.craft = {
  props: {
    src: 'https://via.placeholder.com/150',
    width: '100%',
    useLogoSource: false,
  },
  related: {
    settings: ImageSettings,
  },
};
