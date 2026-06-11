'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Scale, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getInvestmentTypesByProjectAction } from '@/actions/investment-types';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { cn, formatPercentage, NumberParser } from '@/lib/utils';
import { useProject } from '../providers/project-provider';

interface InterestRateInputProps {
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  enableInvestmentTypeDropdown?: boolean;
}

export function InterestRateInput({
  label,
  placeholder,
  min,
  max,
  step = 0.01,
  disabled,
  minimumFractionDigits = 0,
  maximumFractionDigits = 3,
  enableInvestmentTypeDropdown = false,
}: InterestRateInputProps) {
  const form = useFormContext<LoanFormClientData>();
  const { project } = useProject();
  const t = useTranslations('dashboard.loans.new.form');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('de-DE', {
        maximumFractionDigits,
        minimumFractionDigits,
      }),
    [maximumFractionDigits, minimumFractionDigits],
  );

  const parser = useMemo(() => new NumberParser('de-DE'), []);

  const { data: investmentTypes = [], isLoading } = useQuery({
    queryKey: ['investmentTypes', project.id],
    queryFn: async () => {
      const result = await getInvestmentTypesByProjectAction({ projectId: project.id });
      return result?.data?.investmentTypes ?? [];
    },
    enabled: enableInvestmentTypeDropdown,
  });

  const filteredInvestmentTypes = useMemo(() => {
    if (!searchQuery) return investmentTypes;

    const query = searchQuery.toLowerCase();
    return investmentTypes.filter((investmentType) => {
      const name = investmentType.name?.trim() ?? '';
      const rate = formatPercentage(investmentType.interestRate, locale);
      return name.toLowerCase().includes(query) || rate.toLowerCase().includes(query);
    });
  }, [investmentTypes, searchQuery, locale]);

  const handleSelectInvestmentType = (interestRate: number) => {
    form.setValue('interestRate', formatter.format(interestRate), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <FormField
      control={form.control}
      name="interestRate"
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className={cn('flex w-full', !enableInvestmentTypeDropdown && 'relative')}>
              <div className={cn('relative', enableInvestmentTypeDropdown ? 'min-w-0 flex-1' : 'w-full')}>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                  <span className="min-w-10 border-r border-gray-300 py-1.5 text-center text-gray-500 sm:text-sm">
                    %
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder={placeholder}
                  min={min}
                  max={max}
                  disabled={disabled}
                  step={step}
                  {...field}
                  autoComplete="off"
                  value={field.value}
                  onBlur={(event) => {
                    const value = event.target.value;
                    const number = parser.parse(value) ?? 0;
                    field.onChange(formatter.format(number));
                  }}
                  onChange={(event) => {
                    const value = parser.strip(event.target.value);
                    field.onChange(value);
                  }}
                  className={cn(
                    '[appearance:textfield] pl-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                    enableInvestmentTypeDropdown && 'rounded-r-none border-r-0',
                  )}
                />
              </div>

              {enableInvestmentTypeDropdown && (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled}
                      className="h-9 shrink-0 gap-1 rounded-l-none border-l-0 px-2.5"
                      aria-label={t('selectInvestmentType')}
                    >
                      <Scale className="h-4 w-4" />
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <div className="flex flex-col">
                      <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder={t('investmentTypeSearchPlaceholder')}
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {isLoading ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {t('loadingInvestmentTypes')}
                          </div>
                        ) : filteredInvestmentTypes.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">{t('noInvestmentTypes')}</div>
                        ) : (
                          <div className="py-1">
                            {filteredInvestmentTypes.map((investmentType) => {
                              const investmentTypeName = investmentType.name?.trim();
                              const formattedRate = formatPercentage(investmentType.interestRate, locale);
                              const label = investmentTypeName
                                ? `${formattedRate} ${investmentTypeName}`
                                : formattedRate;
                              const currentRate = parser.parse(String(field.value));
                              const isSelected =
                                currentRate !== null && Math.abs(currentRate - investmentType.interestRate) < 0.0001;

                              return (
                                <button
                                  key={investmentType.id}
                                  type="button"
                                  className={cn(
                                    'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                    isSelected && 'bg-accent text-accent-foreground',
                                  )}
                                  onClick={() => handleSelectInvestmentType(investmentType.interestRate)}
                                >
                                  <Check
                                    className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                                  />
                                  <span className="min-w-0 flex-1 truncate">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
