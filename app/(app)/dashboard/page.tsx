"use client";

import React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardSummaryView, MedicineStockView, StockMovement } from "@/types/database";

export default function DashboardPage() {
  // Deterministic date formatting for header
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  // 1. Summary KPIs
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const res = await apiClient<DashboardSummaryView>("/api/dashboard/summary");
      return res.data;
    },
  });

  // 2. Charts
  const { data: chartsData, isLoading: isChartsLoading, refetch: refetchCharts } = useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: async () => {
      const res = await apiClient<{
        stockByCategory: any[];
        purchasesPerMonth: any[];
        topLowStock: any[];
        movementsPerWeek: any[];
      }>("/api/dashboard/charts");
      return res.data;
    },
  });

  // 3. Top 10 Inventory Overview Medicines
  const { data: medicinesData, isLoading: isMedsLoading, refetch: refetchMeds } = useQuery({
    queryKey: ["medicines", "overview"],
    queryFn: async () => {
      const res = await apiClient<MedicineStockView[]>("/api/medicines", {
        params: { pageSize: 10, sort: "sellable_quantity", order: "asc" },
      });
      return res.data;
    },
  });

  // 4. Recent Activity
  const { data: recentActivity, isLoading: isActivityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async () => {
      const res = await apiClient<StockMovement[]>("/api/dashboard/recent-activity");
      return res.data;
    },
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchCharts();
    refetchMeds();
    refetchActivity();
  };

  const formatExpiryMonthYear = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-navy">
            Pharmacy Control Overview
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Real-time status for <span className="font-semibold text-navy">{todayFormatted}</span> (Asia/Kolkata IST)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 text-xs text-navy border-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Data
          </Button>
          <Button asChild size="sm" className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white">
            <Link href="/inventory">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Manage Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock */}
        <Link href="/medicines" className="block group">
          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Inventory
                  </p>
                  {isSummaryLoading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold text-navy mt-1">
                      {summary?.total_stock_units?.toLocaleString() || 0}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">units</span>
                    </h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Value: ₹{summary?.total_stock_value?.toLocaleString() || "0"}</span>
                <span className="text-primary font-medium flex items-center group-hover:underline">
                  View all <ArrowRight className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Low Stock */}
        <Link href="/alerts" className="block group">
          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-[#B7791F]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Low Stock Reorder
                  </p>
                  {isSummaryLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold text-[#B7791F] mt-1">
                      {summary?.low_stock_count || 0}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">items</span>
                    </h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-[#FDF3DC] flex items-center justify-center text-[#B7791F] group-hover:scale-105 transition-transform">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>At or below reorder level</span>
                <span className="text-[#B7791F] font-medium flex items-center group-hover:underline">
                  Reorder <ArrowRight className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Near Expiry */}
        <Link href="/expiry" className="block group">
          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-[#C2570C]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Near Expiry
                  </p>
                  {isSummaryLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold text-[#C2570C] mt-1">
                      {summary?.near_expiry_count || 0}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">items</span>
                    </h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-[#FDECDC] flex items-center justify-center text-[#C2570C] group-hover:scale-105 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Expiring within 60 days</span>
                <span className="text-[#C2570C] font-medium flex items-center group-hover:underline">
                  Review <ArrowRight className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Expired Batches */}
        <Link href="/expiry" className="block group">
          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-[#B42318]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Expired Batches
                  </p>
                  {isSummaryLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold text-[#B42318] mt-1">
                      {summary?.expired_count || 0}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">batches</span>
                    </h3>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-[#FDE7E5] flex items-center justify-center text-[#B42318] group-hover:scale-105 transition-transform">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Held stock to write off</span>
                <span className="text-[#B42318] font-medium flex items-center group-hover:underline">
                  Disposal <ArrowRight className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Charts Section */}
      <DashboardCharts data={chartsData} isLoading={isChartsLoading} />

      {/* Two Column Grid: Inventory Overview Table & Recent Activity Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Overview Table (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-navy">
                Critical Inventory Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Key medicines prioritized by stock levels, reorder urgency, and earliest expiry
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/medicines">
                View All Medicines
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isMedsLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Expiry (MM/YYYY)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicinesData?.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-navy">
                        <Link href={`/medicines/${m.id}`} className="hover:underline">
                          {m.name}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {m.strength} • {m.dosage_form}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {m.sellable_quantity}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatExpiryMonthYear(m.earliest_expiry)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={m.stock_status}
                          hasNearExpiry={m.has_near_expiry}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-clinical-blue">
                          <Link href={`/medicines/${m.id}`}>
                            Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Ledger Activity Feed (1 Col) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-navy flex items-center justify-between">
              <span>Recent Activity</span>
              <Activity className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-xs">
              Live audit movements logged across pharmacy batches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActivityLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivity?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No recent activity recorded.
              </p>
            ) : (
              recentActivity?.map((m: any) => {
                const isOut = m.movement_type === "OUT";
                return (
                  <div
                    key={m.id}
                    className="flex items-start justify-between pb-3 border-b border-border/60 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isOut
                            ? "bg-slate-100 text-[#0B5FA5]"
                            : "bg-[#E6F4EC] text-[#1E8E5A]"
                        }`}
                      >
                        {isOut ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-navy leading-tight">
                          {m.medicine?.name} {m.medicine?.strength}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.reason} • Batch {m.batch?.batch_number || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {m.performer?.full_name || "System"} •{" "}
                          {format(parseISO(m.created_at), "dd MMM HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold ${
                          isOut ? "text-navy" : "text-[#1E8E5A]"
                        }`}
                      >
                        {isOut ? "-" : "+"}
                        {m.quantity}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Bal: {m.batch_balance_after}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full h-8 text-xs text-navy">
                <Link href="/inventory?tab=log">
                  View Full Audit Ledger
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
