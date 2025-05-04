import DashboardNavigation from "@/components/dashboard/dashboard-navigation";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavigation session={session}>
        <div className="h-full">{children}</div>
      </DashboardNavigation>
    </div>
  );
}
