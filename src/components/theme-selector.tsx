'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ColorScheme } from '@/store';
import { useAppStore } from '@/store';

const themes: { value: ColorScheme; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'lavender', label: 'Lavender' },
];

export function ThemeSelector() {
  const { colorScheme, setColorScheme } = useAppStore();
  const commonT = useTranslations('common');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme);
  }, [colorScheme]);

  return (
    <Select value={colorScheme} onValueChange={(value) => setColorScheme(value as ColorScheme)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={commonT('ui.form.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem key={theme.value} value={theme.value}>
            {commonT(`enums.theme.${theme.value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
