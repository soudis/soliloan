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
