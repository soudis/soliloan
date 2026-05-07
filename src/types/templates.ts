import type { CommunicationTemplate } from '@prisma/client';
export type CommunicationTemplateWithProject = Omit<
  CommunicationTemplate,
  'designJson' | 'htmlContent' | 'createdById'
> & {
  project: {
    id: string;
    configuration: {
      name: string;
    };
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
};

export type GlobalTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  type: 'EMAIL' | 'DOCUMENT';
  dataset: CommunicationTemplate['dataset'];
  isGlobal: boolean;
  isSystem: boolean;
  systemKey: string | null;
};
