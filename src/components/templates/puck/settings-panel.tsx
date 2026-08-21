'use client';

import { useTranslations } from 'next-intl';
import { ButtonSettings } from './settings/button-settings';
import { ContainerSettings } from './settings/container-settings';
import { DisplayNameField } from './settings/display-name-field';
import { ImageSettings } from './settings/image-settings';
import { TableSettings } from './settings/table-settings';
import { TextSettings } from './settings/text-settings';
import { ZoneSettings } from './settings/zone-settings';
import {
  useCanDeleteSelected,
  useDeleteSelected,
  useSelectedComponentId,
  useSelectedComponentType,
  useSelectedRecord,
} from './use-puck-selected';
import { useTemplatePuck } from './use-template-puck';

function SelectedSettings() {
  const type = useSelectedComponentType();

  switch (type) {
    case 'Container':
    case 'Body':
      return <ContainerSettings />;
    case 'Table':
      return <TableSettings />;
    case 'Text':
      return <TextSettings />;
    case 'Button':
      return <ButtonSettings />;
    case 'Image':
      return <ImageSettings />;
    case 'PageHeader':
      return <ZoneSettings translationPrefix="templates.editor.components.pageHeader" />;
    case 'PageFooter':
      return <ZoneSettings translationPrefix="templates.editor.components.pageFooter" />;
    default:
      return null;
  }
}

export function SettingsPanel() {
  const t = useTranslations('templates.editor.settings');
  const selectedType = useSelectedComponentType();
  const selectedId = useSelectedComponentId();
  const selectedRecord = useSelectedRecord();
  const config = useTemplatePuck((state) => state.config);
  const canDelete = useCanDeleteSelected();
  const deleteSelected = useDeleteSelected();

  const typeLabel =
    selectedType && selectedType in config.components
      ? (config.components[selectedType as keyof typeof config.components].label as string)
      : selectedType;
  const customName = String(selectedRecord.displayName ?? '').trim();
  const titleLabel = customName || typeLabel;

  if (!selectedType) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-sm italic text-muted-foreground">
        {t('noSelection')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b bg-muted px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {titleLabel} {t('title')}
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b px-4 py-3">
          <DisplayNameField key={selectedId} />
        </div>
        <SelectedSettings key={selectedId ?? selectedType} />
        {canDelete && (
          <div className="mt-4 border-t p-4">
            <button
              type="button"
              className="w-full rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              onClick={deleteSelected}
            >
              {t('delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
