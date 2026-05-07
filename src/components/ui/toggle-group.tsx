import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const toggleGroupVariants = cva('flex items-center justify-center gap-1 rounded-md border bg-muted p-1', {
  variants: {
    variant: {
      default: '',
    },
    size: {
      default: '',
      sm: 'p-0.5',
      lg: 'p-1.5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const toggleGroupItemVariants = cva(
  'inline-flex flex-1 items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground',
  {
    variants: {
      variant: {
        default: '',
      },
      size: {
        default: '',
        sm: 'px-2.5 py-1 text-xs',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function ToggleGroup({
  className,
  variant,
  size,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleGroupVariants>) {
  return <ToggleGroupPrimitive.Root className={cn(toggleGroupVariants({ variant, size, className }))} {...props} />;
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleGroupItemVariants>) {
  return <ToggleGroupPrimitive.Item className={cn(toggleGroupItemVariants({ variant, size, className }))} {...props} />;
}

export { ToggleGroup, ToggleGroupItem };
