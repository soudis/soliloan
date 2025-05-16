import { View } from '@prisma/client';
import { Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ViewState } from '@/store/table-store';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';

interface ViewManagerProps {
  onViewSelect: (view: View | null) => void;
  onViewDelete?: (viewId: string) => Promise<void>;
  onViewDefault?: (viewId: string, isDefault: boolean) => Promise<void>;
  views: View[];
  state: ViewState;
  viewDirty: boolean;
}

export function ViewManager({ onViewSelect, onViewDelete, onViewDefault, views, state, viewDirty }: ViewManagerProps) {
  const t = useTranslations('views');

  // Use a ref to store the callback to avoid dependency issues
  const onViewSelectRef = useRef(onViewSelect);

  // Update the ref when the callback changes
  useEffect(() => {
    onViewSelectRef.current = onViewSelect;
  }, [onViewSelect]);

  useEffect(() => {
    if (views) {
      // Find default view if it exists
      if (state.selectedView === 'init') {
        const defaultView = views.find((view: View) => view.isDefault);
        if (defaultView) {
          onViewSelectRef.current(defaultView);
        } else {
          onViewSelectRef.current(null); // This will trigger the default view
        }
      }
    }
  }, [views, state.selectedView]);

  const handleDelete = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onViewDelete) return;

    try {
      await onViewDelete(viewId);
      if (state.selectedView === viewId) {
        onViewSelectRef.current(null); // Switch to default view
      }
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  };

  const handleViewSelect = (view: View | null) => {
    onViewSelectRef.current(view);
  };

  const handleDefault = async (viewId: string, isDefault: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onViewDefault) return;
    await onViewDefault(viewId, isDefault);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={viewDirty ? 'italic' : ''}>
          {state.selectedView
            ? views?.find((v) => v.id === state.selectedView)?.name || t('loadView')
            : t('defaultView')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewSelect(null)} className="flex items-center justify-between">
          <span>{t('defaultView')}</span>
        </DropdownMenuItem>
        {views?.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => handleViewSelect(view)}
            className="flex items-center justify-between"
          >
            {onViewDefault && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => handleDefault(view.id, view.isDefault ? false : true, e)}
              >
                {view.isDefault ? (
                  <Star className="h-4 w-4 text-primary" />
                ) : (
                  <Star className="h-4 w-4 text-muted-foreground/30" />
                )}
              </Button>
            )}
            <span>{view.name}</span>
            {onViewDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDelete(view.id, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
