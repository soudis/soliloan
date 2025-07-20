import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type Props = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

export const Section = ({ title, icon, children }: Props) => {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </>
  );
};
