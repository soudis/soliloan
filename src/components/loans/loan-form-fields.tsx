'use client';

import { ContractStatus, type Lender } from '@prisma/client';
import { FileX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormDatePicker } from '@/components/form/form-date-picker';
import { FormField } from '@/components/form/form-field';
import { FormNumberInput } from '@/components/form/form-number-input';
import { FormSelect } from '@/components/form/form-select';
import { LenderCombobox } from '@/components/loans/lender-combobox';
import { FormSection } from '@/components/ui/form-section';
import { FormAdditionalFields } from '../form/form-additional-fields';
import { useProject } from '../providers/project-provider';
import { TerminationFormFields } from './termination-form-fields';

interface LoanFormFieldsProps {
  lenders: Lender[];
  isEditMode?: boolean;
}

export function LoanFormFields({ lenders, isEditMode = false }: LoanFormFieldsProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const searchParams = useSearchParams();

  const preselectedLenderId = searchParams.get('lenderId');
  const { project } = useProject();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* General Information Section */}
      <FormSection title={t('new.form.generalInfo')}>
        <FormField
          name="loanNumber"
          label={t('new.form.loanNumber')}
          placeholder={t('new.form.loanNumberPlaceholder')}
          type="number"
          disabled={isEditMode}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LenderCombobox
            name="lenderId"
            label={`${t('new.form.lender')} *`}
            placeholder={commonT('ui.form.selectPlaceholder')}
            disabled={!!preselectedLenderId}
            lenders={lenders}
          />

          <FormDatePicker
            name="signDate"
            label={`${t('new.form.signDate')} *`}
            placeholder={commonT('ui.form.enterPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            name="amount"
            label={`${t('new.form.amount')} *`}
            placeholder={commonT('ui.form.enterPlaceholder')}
            prefix="€"
            min={0.01}
            step={0.01}
          />

          <FormNumberInput
            name="interestRate"
            label={`${t('new.form.interestRate')} *`}
            placeholder={commonT('ui.form.enterPlaceholder')}
            prefix="%"
            minimumFractionDigits={0}
            maximumFractionDigits={3}
            min={0}
            step={0.01}
          />
        </div>
        <FormSelect
          name="contractStatus"
          label={`${t('new.form.contractStatus')} *`}
          placeholder={commonT('ui.form.selectPlaceholder')}
          options={Object.keys(ContractStatus).map((key) => ({
            value: key,
            label: commonT(`enums.loan.contractStatus.${key}`),
          }))}
        />
      </FormSection>

      {/* Termination Information Section */}
      <FormSection icon={<FileX className="w-4 h-4 text-muted-foreground" />} title={t('new.form.terminationInfo')}>
        <TerminationFormFields hideTerminationDate />
      </FormSection>

      {/* Additional Information Section */}
      {((project.configuration.loanAdditionalFields.length ?? 0) > 0 ||
        (project.configuration.altInterestMethods.length ?? 0) > 0) && (
        <FormSection title={t('new.form.additionalInfo')}>
          {(project.configuration.altInterestMethods.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                name="altInterestMethod"
                label={t('new.form.altInterestMethod')}
                placeholder={`${commonT(`enums.interestMethod.${project.configuration.interestMethod}`)} (${commonT('default')})`}
                options={(project.configuration.altInterestMethods ?? []).map((key) => ({
                  value: key,
                  label: commonT(`enums.interestMethod.${key}`),
                }))}
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormAdditionalFields config={project.configuration.loanAdditionalFields} name="additionalFields" />
          </div>
        </FormSection>
      )}
    </div>
  );
}
