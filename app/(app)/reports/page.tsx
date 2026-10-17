"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  ShoppingCart,
  History,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_NAME } from "@/lib/constants";

interface ReportMeta {
  key: "stock-summary" | "low-stock" | "expiry" | "purchases" | "stock-movements";
  title: string;
  description: string;
  icon: any;
  hasDateFilter: boolean;
}

const REPORT_DEFINITIONS: ReportMeta[] = [
  {
    key: "stock-summary",
    title: "Stock Valuation & Inventory Summary",
    description: "Full active catalog inventory breakdown, sellable counts, unit values, and reorder status.",
    icon: Layers,
    hasDateFilter: false,
  },
  {
    key: "low-stock",
    title: "Low Stock & Reorder Requirements",
    description: "All pharmaceutical items at or below designated safety reorder thresholds requiring procurement.",
    icon: AlertTriangle,
    hasDateFilter: false,
  },
  {
    key: "expiry",
    title: "Batch Expiry & Shelf Life Audit",
    description: "Comprehensive batch-level breakdown classifying safe, near-expiry, and expired stocks.",
    icon: Clock,
    hasDateFilter: false,
  },
  {
    key: "purchases",
    title: "Procurement & Purchase Invoices",
    description: "Historical register of verified supplier bills, batch receipts, and consignment valuations.",
    icon: ShoppingCart,
    hasDateFilter: true,
  },
  {
    key: "stock-movements",
    title: "Stock Movement Audit Ledger",
    description: "Tamper-evident chronological audit trail of all IN / OUT dispensing, receipts, and write-offs.",
    icon: History,
    hasDateFilter: true,
  },
];

interface ReportData {
  reportTitle: string;
  dateRange: { from: string | null; to: string | null };
  generatedAt: string;
  generatedBy: string;
  columns: string[];
  rows: Array<Record<string, any>>;
}

export default function ReportsPage() {
  const [selectedReportKey, setSelectedReportKey] = React.useState<ReportMeta["key"]>("stock-summary");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const selectedMeta = REPORT_DEFINITIONS.find((r) => r.key === selectedReportKey)!;

  // Query report JSON preview
  const { data: reportResponse, isLoading, refetch } = useQuery({
    queryKey: ["report-preview", selectedReportKey, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("format", "json");
      if (selectedMeta.hasDateFilter) {
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
      }
      return apiClient.get<ReportData>(`/api/reports/${selectedReportKey}?${params.toString()}`);
    },
  });

  const reportData = reportResponse?.data;

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (selectedMeta.hasDateFilter) {
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
    }
    const downloadUrl = `/api/reports/${selectedReportKey}?${params.toString()}`;
    window.open(downloadUrl, "_blank");
    toast.success("CSV export generated and download initiated.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header (hidden on print) */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Audit & Regulatory Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate, preview, export to CSV with formula injection protection, or print official audit documentation.
        </p>
      </div>

      {/* Report Selection Cards (hidden on print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
        {REPORT_DEFINITIONS.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReportKey === rep.key;
          return (
            <Card
              key={rep.key}
              onClick={() => setSelectedReportKey(rep.key)}
              className={`cursor-pointer transition-all border text-left p-4 flex flex-col justify-between ${
                isSelected
                  ? "border-primary bg-blue-50/40 ring-1 ring-primary shadow-sm"
                  : "border-border hover:border-gray-300 hover:bg-muted/30"
              }`}
            >
              <div className="space-y-2">
                <div className={`p-2 rounded-md w-fit ${isSelected ? "bg-primary text-white" : "bg-muted text-navy"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-xs text-navy leading-snug">{rep.title}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {rep.description}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-medium text-primary">
                {isSelected ? "Active View" : "Select Report"}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Date Filters & Action Bar (hidden on print) */}
      <Card className="border-border print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              {selectedMeta.hasDateFilter ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">From:</Label>
                    <Input
                      type="date"
                      className="text-xs h-9 w-[150px]"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">To:</Label>
                    <Input
                      type="date"
                      className="text-xs h-9 w-[150px]"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Live Snapshot: All current active database records are included.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={handleDownloadCsv} className="text-xs">
                <Download className="h-4 w-4 mr-1.5" /> Download CSV (Excel UTF-8)
              </Button>
              <Button size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary-hover text-white text-xs">
                <Printer className="h-4 w-4 mr-1.5" /> Print Letterhead Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Report Document Container */}
      <Card className="border-border shadow-sm print:border-none print:shadow-none bg-white p-6 sm:p-10">
        <CardContent className="p-0 space-y-6">
          {/* Printable Official Letterhead */}
          <div className="border-b-2 border-navy pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="text-xl font-bold tracking-tight text-navy uppercase">
                  {APP_NAME}
                </div>
                <div className="text-xs text-muted-foreground">
                  Central Pharmacy Inventory & Dispensing Audit Division
                </div>
                <div className="text-sm font-semibold text-primary mt-2">
                  {reportData?.reportTitle || selectedMeta.title}
                </div>
              </div>

              <div className="sm:text-right text-xs text-muted-foreground space-y-0.5">
                <div>Generated On: {reportData ? format(new Date(reportData.generatedAt), "dd/MM/yyyy HH:mm:ss") : "—"}</div>
                <div>Generated By: {reportData?.generatedBy || "System"}</div>
                {selectedMeta.hasDateFilter && (
                  <div>
                    Coverage Range: {fromDate || "Start"} to {toDate || "Present"}
                  </div>
                )}
                <div>Document Classification: Confidential Clinical Audit</div>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Preparing official report dataset...
            </div>
          ) : !reportData || reportData.rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-md">
              No records found for the selected reporting parameters.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    {reportData.columns.map((col, idx) => (
                      <TableHead key={idx} className="text-xs font-bold text-navy whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {reportData.columns.map((col, colIdx) => (
                        <TableCell key={colIdx} className="text-xs whitespace-nowrap">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Report Footer / Signature lines */}
          <div className="pt-8 border-t border-border mt-8 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
            <div>
              <div className="font-semibold text-navy">Certified By:</div>
              <div className="pt-8 border-b border-gray-400 w-48"></div>
              <div className="mt-1">Head Pharmacist / Authorized Inspector</div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="font-semibold text-navy">Verification Stamp:</div>
              <div className="pt-8 border-b border-gray-400 w-48"></div>
              <div className="mt-1">Pharmacy Operations Directorate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
