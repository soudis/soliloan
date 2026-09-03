import { useLocale, useTranslations } from 'next-intl';
import { AdditionalFieldType, type AdditionalFieldConfig, type AdditionalFieldValues } from '@/lib/schemas/common';
import { formatAdditionalFieldValue } from '@/lib/utils/additional-fields';
import { InfoItem } from '../ui/info-item';

export const AdditionalFieldInfoItems = ({
  additionalFields,
  configuration,
}: {
  additionalFields: AdditionalFieldValues;
  configuration?: AdditionalFieldConfig[];
}) => {
  const locale = useLocale();
  const t = useTranslations('common.ui.boolean');
  const booleanLabels = { yes: t('yes'), no: t('no') };

  return (
    <>
      {configuration?.map((field) => {
        const isBoolean = field.type === AdditionalFieldType.BOOLEAN;
        if (!isBoolean && (!additionalFields?.[field.id] || additionalFields[field.id] === '')) {
          return null;
        }
        return (
          <InfoItem
            key={field.id}
            label={field.name}
            value={formatAdditionalFieldValue(additionalFields?.[field.id], field, locale, booleanLabels)}
          />
        );
      })}
    </>
  );
};
