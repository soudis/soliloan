import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type Props = {
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const SectionCard = ({ title, icon, children, className }: Props) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
        {typeof title === 'string' ? <CardTitle className="text-sm font-medium">{title}</CardTitle> : title}
        {icon}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
