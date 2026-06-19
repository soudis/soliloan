'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type ThemeMode = 'system' | 'light' | 'dark';

const themeModes: ThemeMode[] = ['system', 'light', 'dark'];

const themeIcons = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

function useThemeMode() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? theme : 'system') as ThemeMode | undefined;
  const resolvedTheme = themeModes.includes(currentTheme as ThemeMode) ? (currentTheme as ThemeMode) : 'system';

  return {
    mounted,
    theme: resolvedTheme,
    setTheme: (value: ThemeMode) => setTheme(value),
  };
}

export function ThemeModeDropdownItems() {
  const commonT = useTranslations('common');
  const { mounted, theme, setTheme } = useThemeMode();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Monitor className="h-4 w-4" />
        {commonT('ui.appearance')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={mounted ? theme : 'system'} onValueChange={(value) => setTheme(value as ThemeMode)}>
          {themeModes.map((mode) => {
            const Icon = themeIcons[mode];
            return (
              <DropdownMenuRadioItem key={mode} value={mode} className="gap-2">
                <Icon className="h-4 w-4" />
                {commonT(`enums.appearance.${mode}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function ThemeModeSwitch({ className }: { className?: string }) {
  const commonT = useTranslations('common');
  const { mounted, theme, setTheme } = useThemeMode();

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{commonT('ui.appearance')}</Label>
      <RadioGroup
        value={mounted ? theme : 'system'}
        onValueChange={(value) => setTheme(value as ThemeMode)}
        className="grid gap-2"
      >
        {themeModes.map((mode) => {
          const Icon = themeIcons[mode];
          return (
            <div key={mode} className="flex items-center space-x-2">
              <RadioGroupItem value={mode} id={`theme-${mode}`} />
              <Label htmlFor={`theme-${mode}`} className="flex cursor-pointer items-center gap-2 font-normal">
                <Icon className="h-4 w-4" />
                {commonT(`enums.appearance.${mode}`)}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
