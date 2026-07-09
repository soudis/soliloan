'use client';

import { Country } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createRequisitionAction } from '@/actions/gocardless/mutations/create-requisition';
import { getInstitutionsAction } from '@/actions/gocardless/queries/get-institutions';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Institution = {
  id: string;
  name: string;
  logo: string | null;
};

const COUNTRY_OPTIONS = Object.values(Country);

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCountry?: Country | null;
};

export function LinkBankAccountDialog({ projectId, open, onOpenChange, defaultCountry }: Props) {
  const t = useTranslations('dashboard.configuration.gocardless');
  const countryT = useTranslations('common.countries');

  const [country, setCountry] = useState<Country | ''>(defaultCountry ?? '');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>('');

  const { execute: loadInstitutions, isExecuting: isLoadingInstitutions } = useAction(getInstitutionsAction, {
    onSuccess: ({ data }) => {
      setInstitutions(data ?? []);
    },
    onError: ({ error }) => {
      setInstitutions([]);
      toast.error(error.serverError ?? t('errorGeneric'));
    },
  });

  const { execute: connect, isExecuting: isConnecting } = useAction(createRequisitionAction, {
    onSuccess: ({ data }) => {
      if (data?.link) {
        window.location.href = data.link;
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t('errorGeneric'));
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only auto-load institutions when the dialog opens
  useEffect(() => {
    if (open && country && institutions.length === 0 && !isLoadingInstitutions) {
      loadInstitutions({ projectId, country });
    }
  }, [open]);

  const handleCountryChange = (value: string) => {
    const next = value as Country;
    setCountry(next);
    setInstitutionId('');
    setInstitutions([]);
    loadInstitutions({ projectId, country: next });
  };

  const handleConnect = () => {
    if (!institutionId) return;
    connect({ projectId, institutionId });
  };

  const institutionOptions = institutions.map((institution) => ({
    value: institution.id,
    label: institution.name,
    customContent: (
      <span className="flex items-center gap-2">
        {institution.logo ? (
          // biome-ignore lint/performance/noImgElement: needed
          <img src={institution.logo} alt="" className="h-5 w-5 rounded object-contain" />
        ) : null}
        <span className="truncate">{institution.name}</span>
      </span>
    ),
  }));

  const institutionPlaceholder = isLoadingInstitutions
    ? t('institutionLoading')
    : !country
      ? t('institutionSelectCountryFirst')
      : institutions.length === 0
        ? t('institutionNone')
        : t('institutionPlaceholder');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('country')}</Label>
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('countryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {countryT(code.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('institution')}</Label>
            <Combobox
              options={institutionOptions}
              value={institutionId}
              onSelect={setInstitutionId}
              placeholder={institutionPlaceholder}
              emptyText={t('institutionNone')}
              disabled={!country || isLoadingInstitutions || institutions.length === 0}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleConnect} disabled={!institutionId || isConnecting}>
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('connect')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
