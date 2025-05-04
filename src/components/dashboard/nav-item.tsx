"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const { toggleSidebar } = useAppStore();

  return (
    <Link
      href={href}
      onClick={() => {
        // Close sidebar on mobile when a navigation item is clicked
        if (window.innerWidth < 768) {
          toggleSidebar();
        }
      }}
      className={cn(
        "flex items-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="ml-3">{label}</span>
    </Link>
  );
}
