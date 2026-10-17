"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  ArrowUpDown,
  CalendarClock,
  Bell,
  Truck,
  ShoppingCart,
  FileBarChart2,
  Users,
  Settings,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function Sidebar({ onNavClick, className }: SidebarProps) {
  const pathname = usePathname();
  const { profile, isAdmin, logout, isLoggingOut } = useAuth();

  // Load pharmacy settings for dynamic title
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiClient<{ pharmacy_name: string }>("/api/settings");
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Load alert badge count
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await apiClient<{ counts: { total: number } }>("/api/alerts");
      return res.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const totalAlerts = alertsData?.counts?.total || 0;

  const navigationSections = [
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Inventory",
      items: [
        {
          name: "Medicines",
          href: "/medicines",
          icon: Pill,
        },
        {
          name: "Stock Management",
          href: "/inventory",
          icon: ArrowUpDown,
        },
        {
          name: "Expiry Management",
          href: "/expiry",
          icon: CalendarClock,
        },
        {
          name: "Alerts",
          href: "/alerts",
          icon: Bell,
          badge: totalAlerts > 0 ? totalAlerts : undefined,
        },
      ],
    },
    {
      label: "Procurement",
      items: [
        {
          name: "Suppliers",
          href: "/suppliers",
          icon: Truck,
        },
        {
          name: "Purchases",
          href: "/purchases",
          icon: ShoppingCart,
        },
      ],
    },
    {
      label: "Insights",
      items: [
        {
          name: "Reports",
          href: "/reports",
          icon: FileBarChart2,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Administration",
            items: [
              {
                name: "User Management",
                href: "/users",
                icon: Users,
              },
              {
                name: "System Settings",
                href: "/settings",
                icon: Settings,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-navy text-white select-none border-r border-[#133B6B] w-64 shrink-0 justify-between",
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#133B6B]/80 flex flex-col gap-1.5">
          <Logo darkTheme size="md" />
          <p className="text-[11px] text-slate-300 font-medium truncate mt-1">
            {settings?.pharmacy_name || "PharmaTrack Pharmacy"}
          </p>
        </div>

        {/* Grouped Navigation Links */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navigationSections.map((section) => (
            <div key={section.label}>
              <h4 className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {section.label}
              </h4>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group",
                        isActive
                          ? "bg-clinical-blue text-white shadow-sm font-semibold"
                          : "text-slate-300 hover:bg-[#133B6B] hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                          )}
                        />
                        <span>{item.name}</span>
                      </span>

                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                            isActive ? "bg-white text-clinical-blue" : "bg-[#B42318] text-white"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* User Info & Quick Logout */}
      <div className="p-3 border-t border-[#133B6B] bg-navy-dark/70">
        <div className="flex items-center justify-between px-2 py-2 rounded-md">
          <Link
            href="/profile"
            onClick={onNavClick}
            className="flex items-center gap-2.5 truncate hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-full bg-clinical-blue flex items-center justify-center font-bold text-xs text-white shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || "Staff Member"}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-300">
                <Shield className="h-2.5 w-2.5 text-accent" />
                <span className="capitalize">{profile?.role || "Staff"}</span>
              </div>
            </div>
          </Link>

          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Log Out"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
