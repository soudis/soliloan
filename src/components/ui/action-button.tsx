'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children' | 'onClick'> {
  icon: ReactNode;
  tooltip: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  srOnly?: string;
}

export function ActionButton({
  icon,
  tooltip,
  onClick,
  srOnly,
  variant = 'ghost',
  size = 'icon',
  ...buttonProps
}: ActionButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (buttonProps.disabled) {
      return;
    }

    onClick(e);
  };

  const button = (
    <Button variant={variant} size={size} onClick={handleClick} {...buttonProps}>
      {icon}
      {srOnly && <span className="sr-only">{srOnly}</span>}
    </Button>
  );

  // A disabled button has no hover events, so we need to wrap it in a span to make it interactive.
  const triggerChild = buttonProps.disabled ? <span className="inline-flex">{button}</span> : button;

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
}
