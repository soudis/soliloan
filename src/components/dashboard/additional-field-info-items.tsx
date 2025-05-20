import type { AdditionalFieldConfig, AdditionalFieldValues } from '@/lib/schemas/common';
import { formatAdditionalFieldValue } from '@/lib/utils/additional-fields';
import { useLocale } from 'next-intl';
import { InfoItem } from '../ui/info-item';

export const AdditionalFieldInfoItems = ({
  additionalFields,
  configuration,
}: { additionalFields: AdditionalFieldValues; configuration?: AdditionalFieldConfig[] }) => {
  const locale = useLocale();
  return (
    <>
      {configuration?.map(
        (field) =>
          additionalFields?.[field.name] &&
          additionalFields[field.name] !== '' && (
            <InfoItem
              key={field.id}
              label={field.name}
              value={formatAdditionalFieldValue(additionalFields?.[field.name], field, locale)}
            />
          ),
      )}
    </>
  );
};
