"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  Minus,
  Settings2,
  Building,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BatchStatusView, MedicineStockView, StockMovement } from "@/types/database";
import { toast } from "sonner";

interface MedicineDetailResponse {
  medicine: MedicineStockView;
  batches: BatchStatusView[];
  recentMovements: StockMovement[];
}

export default function MedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const medicineId = params.id as string;

  // Modals for Quick Actions
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseReason, setDispenseReason] = useState<"SALE" | "DISPENSE" | "DAMAGED">("SALE");
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustBatchId, setAdjustBatchId] = useState<string>("");
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["medicines", medicineId],
    queryFn: async () => {
      const res = await apiClient<MedicineDetailResponse>(`/api/medicines/${medicineId}`);
      return res.data;
    },
  });

  const medicine = data?.medicine;
  const batches = data?.batches || [];
  const recentMovements = data?.recentMovements || [];

  // Dispense Mutation
  const dispenseMutation = useMutation({
    mutationFn: async () => {
      return await apiClient("/api/stock/out", {
        method: "POST",
        body: JSON.stringify({
          medicine_id: medicineId,
          quantity: dispenseQty,
          reason: dispenseReason,
          notes: dispenseNotes || undefined,
        }),
      });
    },
    onSuccess: (res: any) => {
      toast.success(
        `Successfully dispensed ${dispenseQty} units under FEFO. Deducted from ${res.data?.batches?.length || 1} batch(es).`
      );
      setDispenseOpen(false);
      setDispenseQty(1);
      setDispenseNotes("");
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setDispenseError(err.message);
      } else {
        setDispenseError("Dispense transaction failed.");
      }
    },
  });

  // Adjust Mutation
  const adjustMutation = useMutation({
    mutationFn: async () => {
      return await apiClient("/api/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          batch_id: adjustBatchId,
          new_quantity: adjustNewQty,
          notes: adjustReason,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Batch quantity updated and adjustment logged in audit ledger.");
      setAdjustOpen(false);
      setAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setAdjustError(err.message);
      } else {
        setAdjustError("Stock adjustment failed.");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-navy">Medicine not found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          The requested pharmaceutical record does not exist or has been removed.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/medicines">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-8 w-8 text-navy">
            <Link href="/medicines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-navy">{medicine.name}</h2>
              <span className="text-sm font-medium text-slate-500">
                {medicine.strength} • {medicine.dosage_form}
              </span>
              <StatusBadge status={medicine.stock_status} hasNearExpiry={medicine.has_near_expiry} />
            </div>
            {medicine.generic_name && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Generic: <span className="font-semibold text-slate-700">{medicine.generic_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => {
              setDispenseError(null);
              setDispenseQty(1);
              setDispenseOpen(true);
            }}
            disabled={medicine.sellable_quantity <= 0}
            className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white shadow-xs"
          >
            <Minus className="h-3.5 w-3.5 mr-1" />
            Dispense Stock
          </Button>

          <Button asChild size="sm" variant="outline" className="h-8 text-xs border-slate-300 text-navy">
            <Link href={`/inventory?tab=receive&medId=${medicine.id}`}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Receive Batch
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (batches.length > 0) {
                setAdjustBatchId(batches[0].id);
                setAdjustNewQty(batches[0].quantity);
              }
              setAdjustError(null);
              setAdjustOpen(true);
            }}
            disabled={batches.length === 0}
            className="h-8 text-xs border-slate-300 text-navy"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            Adjust
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sellable Stock
            </p>
            <h3 className="text-2xl font-bold text-navy mt-1">
              {medicine.sellable_quantity}
              <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Reorder Trigger: {medicine.reorder_level}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#B42318]">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expired Units
            </p>
            <h3 className="text-2xl font-bold text-[#B42318] mt-1">
              {medicine.expired_quantity}
              <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Requires write-off
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unit Selling Price
            </p>
            <h3 className="text-2xl font-bold text-navy mt-1">
              ₹{Number(medicine.unit_price).toFixed(2)}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Valuation: ₹{Number(medicine.stock_value || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-navy">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Batches
            </p>
            <h3 className="text-2xl font-bold text-navy mt-1">
              {batches.length}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supplier: {medicine.supplier_name || "Unassigned"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-navy">
            Inventory Batches & Traceability
          </CardTitle>
          <CardDescription className="text-xs">
            All registered batches for {medicine.name}. Dispenses strictly follow FEFO (Earliest Expiry first).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No batches registered yet for this medicine.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead className="text-right">Available Qty</TableHead>
                    <TableHead className="text-right">Initial Qty</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-semibold text-xs text-navy">
                        {b.batch_number}
                      </TableCell>
                      <TableCell className="text-right font-bold text-navy">
                        {b.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {b.initial_quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {b.purchase_price ? `₹${Number(b.purchase_price).toFixed(2)}` : "N/A"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {b.expiry_date}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.days_to_expiry < 0 ? (
                          <span className="text-[#B42318] font-semibold">
                            Expired {Math.abs(b.days_to_expiry)}d ago
                          </span>
                        ) : (
                          <span className={b.days_to_expiry <= 60 ? "text-[#C2570C] font-semibold" : "text-slate-600"}>
                            {b.days_to_expiry} days
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={b.expiry_status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {b.supplier_name || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement Audit Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-navy">
            Audit Ledger Movement History
          </CardTitle>
          <CardDescription className="text-xs">
            Immutable log of transactions for this medicine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((m: any) => {
                const isOut = m.movement_type === "OUT";
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border/70"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isOut ? "bg-slate-200 text-[#0B5FA5]" : "bg-[#E6F4EC] text-[#1E8E5A]"
                        }`}
                      >
                        {isOut ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy">{m.reason}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Batch {m.batch?.batch_number || "N/A"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.notes || "Standard inventory transaction"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-bold ${isOut ? "text-navy" : "text-[#1E8E5A]"}`}>
                        {isOut ? "-" : "+"}
                        {m.quantity} units
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Bal: {m.batch_balance_after} • {format(parseISO(m.created_at), "dd MMM yy HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispense Modal */}
      <Dialog open={dispenseOpen} onOpenChange={setDispenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">
              Dispense Stock (FEFO Automatic Allocation)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispensing will automatically pull from earliest-expiring sellable batches.
            </DialogDescription>
          </DialogHeader>

          {dispenseError && (
            <div className="p-3 rounded-md bg-[#FDE7E5] border border-[#B42318]/30 text-xs text-[#B42318]">
              {dispenseError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 rounded-md border border-border text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Available to Dispense:</span>
              <span className="font-bold text-navy text-sm">{medicine.sellable_quantity} units</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispense-qty" className="text-xs font-semibold text-navy">
                Quantity to Dispense *
              </Label>
              <Input
                id="dispense-qty"
                type="number"
                min={1}
                max={medicine.sellable_quantity}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(parseInt(e.target.value || "1", 10))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-navy">Dispense Reason *</Label>
              <Select
                value={dispenseReason}
                onValueChange={(val: any) => setDispenseReason(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALE">SALE (Customer / Patient Prescription)</SelectItem>
                  <SelectItem value="DISPENSE">DISPENSE (Ward / Clinic Transfer)</SelectItem>
                  <SelectItem value="DAMAGED">DAMAGED (Damaged Packaging / Broken)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispense-notes" className="text-xs font-semibold text-navy">
                Transaction Notes
              </Label>
              <Input
                id="dispense-notes"
                placeholder="Prescription number or department..."
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDispenseOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => dispenseMutation.mutate()}
              disabled={dispenseMutation.isPending || dispenseQty <= 0 || dispenseQty > medicine.sellable_quantity}
              className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white"
            >
              {dispenseMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Allocating FEFO...
                </>
              ) : (
                `Confirm Dispense (${dispenseQty} Units)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Modal */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">
              Audit Stock Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly adjust batch balance. A mandatory reason note is recorded in the immutable audit ledger.
            </DialogDescription>
          </DialogHeader>

          {adjustError && (
            <div className="p-3 rounded-md bg-[#FDE7E5] border border-[#B42318]/30 text-xs text-[#B42318]">
              {adjustError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-navy">Select Batch *</Label>
              <Select value={adjustBatchId} onValueChange={setAdjustBatchId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Batch {b.batch_number} (Current: {b.quantity} units, Exp: {b.expiry_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-qty" className="text-xs font-semibold text-navy">
                Verified Physical Count (New Quantity) *
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                min={0}
                value={adjustNewQty}
                onChange={(e) => setAdjustNewQty(parseInt(e.target.value || "0", 10))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-notes" className="text-xs font-semibold text-navy">
                Mandatory Audit Explanation Reason *
              </Label>
              <Textarea
                id="adjust-notes"
                rows={2}
                placeholder="Reason for discrepancy (e.g. Physical inventory audit recount)..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending || !adjustBatchId || adjustReason.trim().length < 3}
              className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white"
            >
              {adjustMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Updating Ledger...
                </>
              ) : (
                "Save Adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
