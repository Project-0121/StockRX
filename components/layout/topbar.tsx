"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  User,
  Shield,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandMenu } from "./command-menu";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { APP_NAME } from "@/lib/constants";

export function TopBar() {
  const pathname = usePathname();
  const { profile, logout, isLoggingOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch alerts preview
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await apiClient<{
        lowStock: any[];
        nearExpiry: any[];
        expired: any[];
        counts: { lowStock: number; nearExpiry: number; expired: number; total: number };
      }>("/api/alerts");
      return res.data;
    },
    staleTime: 1000 * 30,
  });

  const counts = alertsData?.counts || { lowStock: 0, nearExpiry: 0, expired: 0, total: 0 };

  // Generate readable title from pathname
  const getPageTitle = (path: string) => {
    if (path.startsWith("/medicines/")) return "Medicine Details";
    if (path.startsWith("/purchases/new")) return "New Purchase Invoice";
    if (path.startsWith("/purchases/")) return "Purchase Details";

    switch (path) {
      case "/dashboard":
        return "Executive Inventory Dashboard";
      case "/medicines":
        return "Medicine Directory & Formulary";
      case "/inventory":
        return "Stock Management & Ledger";
      case "/expiry":
        return "Expiry Date Monitoring";
      case "/alerts":
        return "Real-Time Stock Alerts";
      case "/suppliers":
        return "Approved Vendor Directory";
      case "/purchases":
        return "Procurement & Purchase Invoices";
      case "/reports":
        return "Audit Reports & Export";
      case "/users":
        return "Staff & Access Control";
      case "/settings":
        return "System Settings & Thresholds";
      case "/profile":
        return "User Profile & Security";
      default:
        return APP_NAME;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-white px-4 md:px-6 shadow-xs select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Trigger Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-navy rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-navy border-r border-[#133B6B]">
            <Sidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Page Title */}
        <div className="flex flex-col">
          <h1 className="text-base md:text-lg font-bold text-navy leading-tight truncate">
            {getPageTitle(pathname)}
          </h1>
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground font-medium">
            PharmaTrack Clinical Control
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Global Medicine Search */}
        <CommandMenu />

        {/* Notifications Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2 text-muted-foreground hover:text-navy hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {counts.total > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B42318] text-[9px] font-bold text-white shadow-xs">
                  {counts.total > 9 ? "9+" : counts.total}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2 shadow-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                Inventory Alerts
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {counts.total} Active
              </span>
            </div>

            <div className="py-2 space-y-1">
              {counts.total === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No active stock alerts. Inventory levels are healthy.
                </p>
              ) : (
                <>
                  {counts.lowStock > 0 && (
                    <Link
                      href="/alerts#low-stock"
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#B7791F] font-medium">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Low Stock Items</span>
                      </span>
                      <span className="font-bold text-[#B7791F]">{counts.lowStock}</span>
                    </Link>
                  )}

                  {counts.nearExpiry > 0 && (
                    <Link
                      href="/alerts#near-expiry"
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#C2570C] font-medium">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>Near Expiry Batches</span>
                      </span>
                      <span className="font-bold text-[#C2570C]">{counts.nearExpiry}</span>
                    </Link>
                  )}

                  {counts.expired > 0 && (
                    <Link
                      href="/alerts#expired"
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#B42318] font-medium">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>Expired Stock</span>
                      </span>
                      <span className="font-bold text-[#B42318]">{counts.expired}</span>
                    </Link>
                  )}
                </>
              )}
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/alerts"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-clinical-blue hover:text-clinical-blueHover"
              >
                <span>View All Alerts & Actions</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
              <div className="h-8 w-8 rounded-full bg-clinical-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-navy leading-none">
                  {profile?.full_name || "Staff"}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
                  {profile?.role || "Pharmacist"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:inline-block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1 shadow-lg">
            <DropdownMenuLabel>
              <p className="font-bold text-navy text-xs truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate font-normal">
                {profile?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="h-4 w-4 mr-2 text-slate-500" />
                <span>My Profile & Password</span>
              </Link>
            </DropdownMenuItem>
            {profile?.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Shield className="h-4 w-4 mr-2 text-primary" />
                  <span>System Settings</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
