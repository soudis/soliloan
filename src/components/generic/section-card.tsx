import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Props = {
  title: string | React.ReactNode;
  /** Kurzer erklärender Text unter dem Titel */
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export const SectionCard = ({ title, description, icon, children, className, contentClassName }: Props) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2 pb-1">
        <div className="min-w-0 flex-1 space-y-1.5 pr-1">
          {typeof title === 'string' ? <CardTitle className="text-sm font-medium">{title}</CardTitle> : title}
          {description != null && (
            typeof description === 'string' ? (
              <CardDescription>{description}</CardDescription>
            ) : (
              <div className="text-sm text-muted-foreground">{description}</div>
            )
          )}
        </div>
        {icon}
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
};
