'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AddEntityMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
};

interface AddEntityMenuProps {
  items: AddEntityMenuItem[];
  /** `header` matches the lender page header; `toolbar` matches the loan accordion actions. */
  density?: 'header' | 'toolbar';
}

export function AddEntityMenu({ items, density = 'header' }: AddEntityMenuProps) {
  const commonT = useTranslations('common');
  const isHeader = density === 'header';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionButton
          intent="add"
          density={isHeader ? 'header' : 'toolbar'}
          icon={<Plus className={isHeader ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
          label={commonT('ui.actions.add')}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <TooltipProvider>
          {items.map((item) => {
            const menuItem = (
              <DropdownMenuItem
                disabled={item.disabled && !item.disabledTooltip}
                aria-disabled={item.disabled || undefined}
                className={cn(item.disabled && item.disabledTooltip && 'pointer-events-auto opacity-50')}
                onSelect={(event) => {
                  if (item.disabled) {
                    event.preventDefault();
                    return;
                  }
                  item.onSelect();
                }}
              >
                {item.label}
              </DropdownMenuItem>
            );

            if (!item.disabled || !item.disabledTooltip) {
              return <Fragment key={item.id}>{menuItem}</Fragment>;
            }

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
                <TooltipContent>{item.disabledTooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AddTypeButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function AddTypeButton({ label, onClick, disabled, disabledTooltip }: AddTypeButtonProps) {
  return (
    <ActionButton
      intent="add"
      density="xs"
      icon={<Plus className="size-3" />}
      label={label}
      onClick={onClick}
      disabled={disabled}
      tooltip={disabled ? disabledTooltip : undefined}
    />
  );
}
