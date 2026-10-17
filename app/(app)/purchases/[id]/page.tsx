"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import {
  Printer,
  ArrowLeft,
  Building,
  Calendar,
  FileText,
  User,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_NAME } from "@/lib/constants";

interface PurchaseDetail {
  id: string;
  invoice_number: string | null;
  purchase_date: string;
  total_cost: number;
  notes: string | null;
  created_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  items: Array<{
    id: string;
    batch_number: string;
    quantity: number;
    unit_cost: number;
    expiry_date: string;
    medicine: {
      name: string;
      strength: string;
      dosage_form: string;
    };
  }>;
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => apiClient.get<PurchaseDetail>(`/api/purchases/${id}`),
    enabled: !!id,
  });

  const purchase = purchaseData?.data;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading purchase invoice...
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Purchase order not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/purchases">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchases
          </Button>
        </Link>
        <Button onClick={handlePrint} className="bg-primary hover:bg-primary-hover text-white">
          <Printer className="h-4 w-4 mr-2" /> Print Invoice
        </Button>
      </div>

      {/* Invoice Document Card */}
      <Card className="border-border shadow-sm print:border-none print:shadow-none bg-white p-6 sm:p-10">
        <CardContent className="p-0 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border pb-6 gap-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-navy">{APP_NAME}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Central Pharmaceutical Inventory & Dispensing System
              </div>
              <div className="text-xs text-muted-foreground">
                Official Purchase Goods Receipt Note (GRN)
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-2xl font-bold text-navy font-mono">
                {purchase.invoice_number || `GRN-${purchase.id.slice(0, 8).toUpperCase()}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Receipt Date: {format(parseISO(purchase.purchase_date), "dd MMMM yyyy")}
              </div>
              <div className="text-xs text-muted-foreground">
                Recorded: {format(new Date(purchase.created_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
          </div>

          {/* Supplier & Creator Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-1.5">
              <div className="font-bold text-navy flex items-center gap-1.5 text-sm">
                <Building className="h-4 w-4 text-teal" /> Vendor / Supplier Information
              </div>
              <div className="font-semibold text-foreground text-sm">
                {purchase.supplier?.name || "Direct Cash Purchase"}
              </div>
              {purchase.supplier?.contact_person && (
                <div>Contact: {purchase.supplier.contact_person}</div>
              )}
              {purchase.supplier?.phone && <div>Phone: {purchase.supplier.phone}</div>}
              {purchase.supplier?.email && <div>Email: {purchase.supplier.email}</div>}
              {purchase.supplier?.address && <div>Address: {purchase.supplier.address}</div>}
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-1.5">
              <div className="font-bold text-navy flex items-center gap-1.5 text-sm">
                <User className="h-4 w-4 text-primary" /> Receiving Authority
              </div>
              <div className="font-semibold text-foreground text-sm">
                {purchase.creator?.full_name || "System Administrator"}
              </div>
              <div>Staff Email: {purchase.creator?.email || "internal@pharmacy.com"}</div>
              <div>Verification Status: Verified & Stocked into Central Ledger</div>
              {purchase.notes && (
                <div className="pt-2 text-muted-foreground border-t border-border mt-2">
                  <span className="font-medium text-foreground">Consignment Remarks:</span> {purchase.notes}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Medicine Item</TableHead>
                  <TableHead className="text-xs">Dosage Form</TableHead>
                  <TableHead className="text-xs">Batch Number</TableHead>
                  <TableHead className="text-xs">Expiry Date</TableHead>
                  <TableHead className="text-xs text-right">Received Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit Rate (₹)</TableHead>
                  <TableHead className="text-xs text-right">Line Total (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items?.map((item: PurchaseDetail["items"][number], idx: number) => {
                  const lineTotal = item.quantity * item.unit_cost;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-semibold text-navy">
                        {item.medicine.name} {item.medicine.strength}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.medicine.dosage_form}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {item.batch_number}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(parseISO(item.expiry_date), "MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        ₹{item.unit_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-navy">
                        ₹{lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Grand Total */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-72 bg-muted/40 p-4 rounded-lg border border-border space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span>₹{purchase.total_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Taxes & Duties:</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between text-base font-bold text-navy pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span>₹{purchase.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Official Signatures Footer (Visible on print) */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
            <div className="border-t border-dashed border-border pt-2 text-center">
              Received By / Pharmacist In-Charge
            </div>
            <div className="border-t border-dashed border-border pt-2 text-center">
              Verified By / Store Superintendent
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
