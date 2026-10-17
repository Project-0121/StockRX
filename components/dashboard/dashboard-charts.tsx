"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardChartsProps {
  data?: {
    stockByCategory: { name: string; total_units: number; stock_value: number }[];
    purchasesPerMonth: { month: string; total_cost: number; count: number }[];
    topLowStock: { name: string; current: number; reorder: number; deficit: number }[];
    movementsPerWeek: { week: string; in: number; out: number }[];
  };
  isLoading: boolean;
}

const CATEGORY_COLORS = [
  "#0B5FA5", // Clinical Blue
  "#0E8A8A", // Medical Teal
  "#1E8E5A", // Forest Green
  "#B7791F", // Ochre Low Stock
  "#C2570C", // Rust Near Expiry
  "#4F46E5", // Indigo
  "#0284C7", // Sky Blue
  "#0D9488", // Teal Dark
  "#D97706", // Amber
  "#64748B", // Slate
];

export function DashboardCharts({ data, isLoading }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  const stockByCategory = data?.stockByCategory || [];
  const purchasesPerMonth = data?.purchasesPerMonth || [];
  const topLowStock = data?.topLowStock || [];
  const movementsPerWeek = data?.movementsPerWeek || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Stock By Category (Donut) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-navy">
            Inventory Units by Category
          </CardTitle>
          <CardDescription className="text-xs">
            Distribution of sellable units across pharmaceutical categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {stockByCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No inventory data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="total_units"
                    nameKey="name"
                  >
                    {stockByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      `${value} units`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#0B2545",
                      color: "#FFFFFF",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Purchases Per Month (Line) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-navy">
            Monthly Procurement Expenditure
          </CardTitle>
          <CardDescription className="text-xs">
            Total purchase invoice volume over the past 12 months (INR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={purchasesPerMonth}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#5B6776" }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#5B6776" }}
                  stroke="#CBD5E1"
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <RechartsTooltip
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, "Spend"]}
                  contentStyle={{
                    backgroundColor: "#0B2545",
                    color: "#FFFFFF",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "none",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total_cost"
                  stroke="#0B5FA5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0B5FA5" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Low-Stock Reorder Deficit (Horizontal Bar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-navy">
            Critical Stock Deficit
          </CardTitle>
          <CardDescription className="text-xs">
            Top 5 medicines with highest units deficit against required reorder levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {topLowStock.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                All medicines are currently above reorder thresholds
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLowStock}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#5B6776" }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#0B2545", width: 90 }}
                    stroke="#CBD5E1"
                  />
                  <RechartsTooltip
                    formatter={(val: number, name: string) => [
                      `${val} units`,
                      name === "deficit" ? "Required Reorder" : "Current Stock",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0B2545",
                      color: "#FFFFFF",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="current" fill="#0E8A8A" name="Current Stock" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="deficit" fill="#B7791F" name="Deficit Below Reorder" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Weekly Stock Activity Movements (Bar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-navy">
            Weekly Transaction Ledger Activity
          </CardTitle>
          <CardDescription className="text-xs">
            Inflow receipts vs outflow dispenses over the last 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movementsPerWeek}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#5B6776" }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#5B6776" }}
                  stroke="#CBD5E1"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0B2545",
                    color: "#FFFFFF",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "none",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                <Bar dataKey="in" fill="#1E8E5A" name="Stock In (Receipts)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="out" fill="#0B5FA5" name="Stock Out (Dispensed)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
