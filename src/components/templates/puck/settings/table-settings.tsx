'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockPaddingFields } from '../../block-padding-fields';
import { BorderField } from '../fields/border-field';
import { ColumnWidthsField } from '../fields/column-widths-field';
import { LoopKeyField } from '../fields/loop-key-field';
import { TableCellStyleField } from '../fields/table-cell-field';
import { resizeTableArrays, type TableCellStyle, type TextAlign } from '../table-model';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';
import { usePaddingAdapter } from './use-padding-adapter';

export function TableSettings() {
  const t = useTranslations('templates.editor.components.table');
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const { paddingProps, setProp } = usePaddingAdapter();

  const loopKey = String(props.loopKey ?? '');
  const columns = Number(props.columns ?? 1);
  const rows = Number(props.rows ?? 1);
  const isDynamic = loopKey.length > 0;

  const resize = (nextColumns: number, nextRows: number) => {
    patch(
      resizeTableArrays({
        columns: nextColumns,
        rows: nextRows,
        headerTexts: (props.headerTexts as string[] | undefined) ?? [],
        cellTexts: (props.cellTexts as string[][] | undefined) ?? [],
        headerStyles: (props.headerStyles as TableCellStyle[] | undefined) ?? [],
        cellStyles: (props.cellStyles as TableCellStyle[][] | undefined) ?? [],
        columnWidths: (props.columnWidths as number[] | undefined) ?? [],
        textAlign: (props.textAlign as TextAlign) ?? 'left',
      }),
    );
  };

  const handleColumnsChange = (nextColumns: number) => {
    if (nextColumns < 1 || nextColumns > 10) return;
    resize(nextColumns, rows);
  };

  const handleRowsChange = (nextRows: number) => {
    if (nextRows < 1 || nextRows > 50) return;
    resize(columns, nextRows);
  };

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="structure">
        <TabsList variant="modern" className="mt-0">
          <TabsTrigger variant="modern" size="sm" value="structure">
            {t('tabStructure')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="style">
            {t('tabStyle')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="cell">
            {t('tabCell')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="data">
            {t('tabData')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-3 space-y-4">
          <LoopKeyField translationPrefix="templates.editor.components.table" emptyOptionKey="staticTable" />
        </TabsContent>

        <TabsContent value="structure" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="columns">
              {t('columns')}
            </label>
            <input
              id="columns"
              type="number"
              min={1}
              max={10}
              value={columns}
              onChange={(event) => handleColumnsChange(Number(event.target.value))}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>

          {!isDynamic && (
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="rows">
                {t('rows')}
              </label>
              <input
                id="rows"
                type="number"
                min={1}
                max={50}
                value={rows}
                onChange={(event) => handleRowsChange(Number(event.target.value))}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          )}

          <ColumnWidthsField />
        </TabsContent>

        <TabsContent value="style" className="mt-3 space-y-4">
          <BlockPaddingFields idPrefix="table" props={paddingProps} setProp={setProp} />
          <BorderField translationPrefix="templates.editor.components.table" defaultEnabled />
        </TabsContent>

        <TabsContent value="cell" className="mt-3 space-y-4">
          <TableCellStyleField />
        </TabsContent>
      </Tabs>
    </div>
  );
}
