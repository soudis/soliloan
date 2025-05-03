import { getViewsByType } from '@/app/actions/views';
import { Button } from '@/components/ui/button';
import { View, ViewType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';


interface ViewManagerProps {
  viewType: ViewType;
  onViewSelect: (view: View | null) => void;
  onViewDelete?: (viewId: string) => Promise<void>;
  onLoad?: () => void;
  refreshTrigger?: number;
}

export function ViewManager({ viewType, onViewSelect, onViewDelete, onLoad, refreshTrigger = 0 }: ViewManagerProps) {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const t = useTranslations('views');

  // Use a ref to store the callback to avoid dependency issues
  const onViewSelectRef = useRef(onViewSelect);
  const onLoadRef = useRef(onLoad);

  // Update the ref when the callback changes
  useEffect(() => {
    onViewSelectRef.current = onViewSelect;
  }, [onViewSelect]);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const { data: views, isLoading, error } = useQuery({
    queryKey: ['views', viewType, refreshTrigger],
    queryFn: async () => {
      const { views: fetchedViews, error } = await getViewsByType(viewType);
      if (error) {
        throw new Error(error);
      }
      return fetchedViews;
    },
  });

  useEffect(() => {
    if (views && !isLoading) {
      onLoadRef.current?.();
    }
  }, [views, onLoad, isLoading]);

  useEffect(() => {
    if (views) {
      // Find default view if it exists
      const defaultView = views.find((view: View) => view.isDefault);
      if (defaultView) {
        setSelectedView(defaultView.id);
        onViewSelectRef.current(defaultView);
      } else {
        setSelectedView(null);
        onViewSelectRef.current(null); // This will trigger the default view
      }
    }
  }, [views]);

  const handleDelete = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onViewDelete) return;

    try {
      await onViewDelete(viewId);
      if (selectedView === viewId) {
        setSelectedView(null);
        onViewSelectRef.current(null); // Switch to default view
      }
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  };

  const handleViewSelect = (view: View | null) => {
    setSelectedView(view?.id || null);
    onViewSelectRef.current(view);
  };

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <Button variant="outline" size="sm" disabled>
        {t('error')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {selectedView ? views?.find(v => v.id === selectedView)?.name || t('loadView') : t('defaultView')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleViewSelect(null)}
          className="flex items-center justify-between"
        >
          <span>{t('defaultView')}</span>
        </DropdownMenuItem>
        {views?.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => handleViewSelect(view)}
            className="flex items-center justify-between"
          >
            <span>{view.name}</span>
            {onViewDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => handleDelete(view.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
