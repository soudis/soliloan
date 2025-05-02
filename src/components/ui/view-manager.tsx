import { getViewsByType } from '@/app/actions/views';
import { Button } from '@/components/ui/button';
import { ViewType } from '@prisma/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface View {
  id: string;
  userId: string;
  type: ViewType;
  name: string;
  data: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ViewManagerProps {
  viewType: ViewType;
  onViewSelect: (view: View | null) => void;
  onViewDelete?: (viewId: string) => Promise<void>;
  refreshTrigger?: number;
}

export function ViewManager({ viewType, onViewSelect, onViewDelete, refreshTrigger = 0 }: ViewManagerProps) {
  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const t = useTranslations('views');

  // Use a ref to store the callback to avoid dependency issues
  const onViewSelectRef = useRef(onViewSelect);

  // Update the ref when the callback changes
  useEffect(() => {
    onViewSelectRef.current = onViewSelect;
  }, [onViewSelect]);

  // Function to fetch views
  const fetchViews = async () => {
    try {
      setLoading(true);
      const { views: fetchedViews, error } = await getViewsByType(viewType);
      if (error) {
        throw new Error(error);
      }
      if (fetchedViews) {
        setViews(fetchedViews);

        // Find default view if it exists
        const defaultView = fetchedViews.find((view: View) => view.isDefault);
        if (defaultView) {
          setSelectedView(defaultView.id);
          onViewSelectRef.current(defaultView);
        } else {
          setSelectedView(null);
          onViewSelectRef.current(null); // This will trigger the default view
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching views:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViews();
  }, [viewType, refreshTrigger]); // Add refreshTrigger to dependencies

  const handleDelete = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onViewDelete) return;

    try {
      await onViewDelete(viewId);
      setViews(views.filter(view => view.id !== viewId));
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

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </Button>
    );
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
          {selectedView ? views.find(v => v.id === selectedView)?.name || t('loadView') : t('defaultView')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleViewSelect(null)}
          className="flex items-center justify-between"
        >
          <span>{t('defaultView')}</span>
        </DropdownMenuItem>
        {views.map((view) => (
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
