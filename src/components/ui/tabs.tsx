'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva('inline-flex items-center justify-center text-muted-foreground w-full', {
  variants: {
    variant: {
      default: 'h-10 rounded-md bg-transparent p-0 mt-4 flex justify-start gap-0',
      modern: 'h-auto p-1 bg-muted rounded-md gap-1 mt-4 flex justify-start',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn(tabsListVariants({ variant, className }))} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'rounded-none border-b-2 border-transparent px-6 pt-1 pb-2 font-medium data-[state=active]:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent',
        modern:
          'flex-1 md:flex-none flex flex-col md:flex-row gap-1 md:gap-2 py-2 md:px-4 rounded-lg text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground',
      },
      size: {
        default: 'text-lg',
        sm: 'text-sm',
      },
    },
    compoundVariants: [
      {
        variant: 'modern',
        size: 'default',
        className: 'text-[10px] md:text-base font-medium',
      },
      {
        variant: 'modern',
        size: 'sm',
        className: 'text-[10px] md:text-sm font-medium',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn(tabsTriggerVariants({ variant, size, className }))} {...props} />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
