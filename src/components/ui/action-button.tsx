'use client';

import { type ComponentProps, forwardRef, type MouseEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ADD_ACTION_BUTTON_CLASS,
  DELETE_ACTION_BUTTON_CLASS,
  EDIT_ACTION_BUTTON_CLASS,
  NEUTRAL_ACTION_BUTTON_CLASS,
} from './action-button-classes';

export type ActionButtonIntent = 'add' | 'edit' | 'delete' | 'neutral';
export type ActionButtonDensity = 'header' | 'toolbar' | 'xs' | 'icon';

type ActionButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  icon: ReactNode;
  /** Visible label. For `header` / `toolbar`, shown from `sm` up (sr-only on xs). */
  label?: ReactNode;
  tooltip?: string;
  srOnly?: string;
  intent?: ActionButtonIntent;
  /** `icon` keeps the original ghost icon button. */
  density?: ActionButtonDensity;
};

const INTENT_CLASS: Record<ActionButtonIntent, string> = {
  add: ADD_ACTION_BUTTON_CLASS,
  edit: EDIT_ACTION_BUTTON_CLASS,
  delete: DELETE_ACTION_BUTTON_CLASS,
  neutral: NEUTRAL_ACTION_BUTTON_CLASS,
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    icon,
    label,
    tooltip,
    srOnly,
    intent,
    density = 'icon',
    variant,
    size,
    className,
    onClick,
    disabled,
    type = 'button',
    ...buttonProps
  },
  ref,
) {
  const isLabeledDensity = density === 'header' || density === 'toolbar';
  const resolvedVariant = variant ?? (density === 'icon' && !intent ? 'ghost' : 'outline');
  const resolvedSize =
    size ?? (density === 'xs' ? 'xs' : density === 'header' || density === 'toolbar' ? 'sm' : 'icon');

  const densityClass =
    density === 'header'
      ? 'h-9 w-9 p-0 sm:w-auto sm:px-3'
      : density === 'toolbar'
        ? 'h-8 w-8 p-0 sm:w-auto sm:px-2'
        : density === 'icon' && intent
          ? 'h-8 w-8'
          : undefined;

  const handleClick = onClick
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (disabled) return;
        onClick(event);
      }
    : undefined;

  const button = (
    <Button
      ref={ref}
      type={type}
      variant={resolvedVariant}
      size={resolvedSize}
      disabled={disabled}
      onClick={handleClick}
      className={cn(intent && INTENT_CLASS[intent], densityClass, className)}
      {...buttonProps}
    >
      {icon}
      {label ? <span className={cn(isLabeledDensity && 'sr-only sm:not-sr-only sm:inline')}>{label}</span> : null}
      {srOnly ? <span className="sr-only">{srOnly}</span> : null}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  const triggerChild = disabled ? <span className="inline-flex">{button}</span> : button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{triggerChild}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
