"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import {
  ShoppingCart,
  Plus,
  Eye,
  Calendar,
  Building,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseRow {
  id: string;
  invoice_number: string | null;
  purchase_date: string;
  total_cost: number;
  notes: string | null;
  created_at: string;
  supplier?: { id: string; name: string };
  creator?: { id: string; full_name: string };
}

interface SupplierOption {
  id: string;
  name: string;
}

export default function PurchasesPage() {
  const [page, setPage] = React.useState(1);
  const [supplierId, setSupplierId] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  // Suppliers lookup for filter
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-lookup"],
    queryFn: () => apiClient.get<SupplierOption[]>("/api/suppliers"),
  });
  const suppliers = suppliersData?.data || [];

  // Purchases query
  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ["purchases", page, supplierId, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "15");
      if (supplierId !== "all") params.set("supplierId", supplierId);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      return apiClient.get<PurchaseRow[]>(`/api/purchases?${params.toString()}`);
    },
  });

  const purchases = purchasesData?.data || [];
  const meta = purchasesData?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Procurement & Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-item purchase orders, vendor invoices, and incoming batch receipts.
          </p>
        </div>
        <Link href="/purchases/new">
          <Button className="bg-primary hover:bg-primary-hover text-white">
            <Plus className="h-4 w-4 mr-2" /> New Purchase Receipt
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select
                value={supplierId}
                onValueChange={(val) => {
                  setSupplierId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                className="text-xs"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                className="text-xs"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases List */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-teal" />
            Purchase Invoices Log
          </CardTitle>
          <CardDescription>
            Historical record of all verified pharmaceutical stock receipts and vendor bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Invoice Number</TableHead>
                  <TableHead className="text-xs">Purchase Date</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs text-right">Total Amount</TableHead>
                  <TableHead className="text-xs">Recorded By</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Loading purchase orders...
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      No purchase orders found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-mono font-semibold text-navy">
                        {p.invoice_number || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(parseISO(p.purchase_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {p.supplier?.name || "Direct / Local"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-navy">
                        ₹{p.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.creator?.full_name || "System"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={p.notes || ""}>
                        {p.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/purchases/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary-hover">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Invoice
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} orders)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (meta.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
