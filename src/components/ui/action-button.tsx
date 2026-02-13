'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionButtonProps extends Omit<React.ComponentProps<'button'>, 'onClick' | 'children'> {
  icon: ReactNode;
  tooltip: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  srOnly?: string;
}

export function ActionButton({ icon, tooltip, onClick, srOnly, ...buttonProps }: ActionButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick(e);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleClick} {...buttonProps}>
            {icon}
            {srOnly && <span className="sr-only">{srOnly}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
