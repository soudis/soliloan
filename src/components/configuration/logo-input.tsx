'use client';

import { Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import type { ConfigurationFormGeneralData } from '@/lib/schemas/configuration';

interface LogoInputProps {
  form: UseFormReturn<ConfigurationFormGeneralData>;
}

export function LogoInput({ form }: LogoInputProps) {
  const t = useTranslations('dashboard.configuration');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const logo = form.getValues('logo');
    if (logo) {
      setLogoPreview(logo);
    }
  }, [form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64String = event.target.result as string;
          form.setValue('logo', base64String);
          setLogoPreview(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    form.setValue('logo', null);
    setLogoPreview(null);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <FormItem>
      <FormLabel>{t('form.logo')}</FormLabel>
      <FormControl>
        <div className="border rounded-md overflow-hidden">
          <div className="relative aspect-[16/5]">
            {logoPreview ? (
              <>
                <Image src={logoPreview} alt="Logo preview" fill className="object-contain p-8" />
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleRemove}>
                  <Trash2 className="h-8 w-8 text-destructive" />
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">{t('form.noLogo')}</div>
            )}
          </div>
          <div className="border-t">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
            <Button type="button" variant="ghost" className="w-full rounded-none" onClick={handleButtonClick}>
              <Upload className="h-4 w-4 mr-2" />
              {t('form.uploadLogo')}
            </Button>
          </div>
        </div>
      </FormControl>
    </FormItem>
  );
}
