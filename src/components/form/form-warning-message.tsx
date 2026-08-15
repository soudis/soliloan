'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { NoWrap } from '@/components/ui/no-wrap';
import type { FormWarning, FormWarningMessageNamespace, FormWarningMessageValues } from '@/types/form-warnings';

const richTextTags = {
  nowrap: (chunks: ReactNode) => <NoWrap>{chunks}</NoWrap>,
};

function RichFormWarningMessage({
  messageNamespace,
  messageKey,
  messageValues = {},
}: {
  messageNamespace: FormWarningMessageNamespace;
  messageKey: string;
  messageValues?: FormWarningMessageValues;
}) {
  const t = useTranslations(messageNamespace);

  return t.rich(messageKey, {
    ...messageValues,
    ...richTextTags,
  });
}

export function FormWarningMessage({ warning }: { warning: FormWarning }) {
  if (warning.message) {
    return warning.message;
  }

  if (warning.messageKey && warning.messageNamespace) {
    return (
      <RichFormWarningMessage
        messageNamespace={warning.messageNamespace}
        messageKey={warning.messageKey}
        messageValues={warning.messageValues}
      />
    );
  }

  return null;
}
