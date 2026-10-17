"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { allocateFefo } from "@/lib/inventory";
import { MOVEMENT_REASONS } from "@/lib/constants";

interface MedicineOption {
  id: string;
  name: string;
  strength: string;
  dosage_form: string;
  sellable_quantity: number;
}

interface BatchOption {
  id: string;
  medicine_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  expiry_status?: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface MovementRow {
  id: string;
  movement_type: "IN" | "OUT";
  reason: string;
  quantity: number;
  batch_balance_after: number;
  notes: string | null;
  created_at: string;
  medicine?: { name: string; strength: string };
  batch?: { batch_number: string };
  user?: { full_name: string };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("dispense");

  // Fetch medicines for comboboxes
  const { data: medicinesData } = useQuery({
    queryKey: ["medicines-lookup"],
    queryFn: () => apiClient.get<MedicineOption[]>("/api/medicines?pageSize=100&includeInactive=false"),
  });
  const medicines = medicinesData?.data || [];

  // Fetch suppliers for Receive tab
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-lookup"],
    queryFn: () => apiClient.get<SupplierOption[]>("/api/suppliers"),
  });
  const suppliers = suppliersData?.data || [];

  // -------------------------------------------------------------
  // TAB 1: DISPENSE (FEFO) STATE & LOGIC
  // -------------------------------------------------------------
  const [dispenseMedId, setDispenseMedId] = React.useState<string>("");
  const [dispenseQty, setDispenseQty] = React.useState<number | "">("");
  const [dispenseReason, setDispenseReason] = React.useState<"SALE" | "DISPENSE" | "DAMAGED">("DISPENSE");
  const [dispenseNotes, setDispenseNotes] = React.useState<string>("");
  const [dispenseResult, setDispenseResult] = React.useState<{
    requested: number;
    dispensed: number;
    batches: Array<{ batch_number: string; expiry_date: string; taken: number; remaining_in_batch: number }>;
  } | null>(null);

  // Fetch candidate batches for the selected medicine to show live FEFO preview
  const { data: medBatchesData, isLoading: isLoadingMedBatches } = useQuery({
    queryKey: ["medicine-batches", dispenseMedId],
    queryFn: () => apiClient.get<BatchOption[]>(`/api/batches?medicineId=${dispenseMedId}`),
    enabled: !!dispenseMedId,
  });
  const medBatches = medBatchesData?.data || [];
  const selectedMed = medicines.find((m) => m.id === dispenseMedId);

  // Calculate live FEFO allocation preview using pure TypeScript logic
  const fefoPreview = React.useMemo(() => {
    if (!dispenseQty || typeof dispenseQty !== "number" || dispenseQty <= 0) return null;
    const batches = medBatchesData?.data || [];
    const today = format(new Date(), "yyyy-MM-dd");
    return allocateFefo(
      batches.map((b) => ({
        id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        quantity: b.quantity,
      })),
      dispenseQty,
      today
    );
  }, [medBatchesData?.data, dispenseQty]);

  const dispenseMutation = useMutation({
    mutationFn: (data: { medicine_id: string; quantity: number; reason: string; notes?: string }) =>
      apiClient.post<{
        medicine_id: string;
        requested: number;
        dispensed: number;
        batches: Array<{ batch_number: string; expiry_date: string; taken: number; remaining_in_batch: number }>;
      }>("/api/stock/out", data),
    onSuccess: (res) => {
      toast.success(`Successfully dispensed ${res.data.dispensed} units via FEFO.`);
      setDispenseResult(res.data);
      setDispenseQty("");
      setDispenseNotes("");
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["medicines-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["medicine-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to dispense stock.");
    },
  });

  const handleDispenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispenseMedId || !dispenseQty || typeof dispenseQty !== "number" || dispenseQty <= 0) {
      toast.error("Please select a medicine and valid quantity.");
      return;
    }
    dispenseMutation.mutate({
      medicine_id: dispenseMedId,
      quantity: dispenseQty,
      reason: dispenseReason,
      notes: dispenseNotes.trim() || undefined,
    });
  };

  // -------------------------------------------------------------
  // TAB 2: RECEIVE (Single Item Stock In)
  // -------------------------------------------------------------
  const [receiveMedId, setReceiveMedId] = React.useState<string>("");
  const [receiveBatchNo, setReceiveBatchNo] = React.useState<string>("");
  const [receiveQty, setReceiveQty] = React.useState<number | "">("");
  const [receiveCost, setReceiveCost] = React.useState<number | "">("");
  const [receiveExpiry, setReceiveExpiry] = React.useState<string>("");
  const [receiveMfg, setReceiveMfg] = React.useState<string>("");
  const [receiveSupplierId, setReceiveSupplierId] = React.useState<string>("");
  const [receiveInvoice, setReceiveInvoice] = React.useState<string>("");
  const [receiveNotes, setReceiveNotes] = React.useState<string>("");

  const receiveMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/stock/in", data),
    onSuccess: () => {
      toast.success("Stock received successfully and added to inventory.");
      setReceiveMedId("");
      setReceiveBatchNo("");
      setReceiveQty("");
      setReceiveCost("");
      setReceiveExpiry("");
      setReceiveMfg("");
      setReceiveSupplierId("");
      setReceiveInvoice("");
      setReceiveNotes("");
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["medicines-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to receive stock.");
    },
  });

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveMedId || !receiveBatchNo || !receiveQty || !receiveCost || !receiveExpiry) {
      toast.error("Please fill in all required fields (Medicine, Batch #, Quantity, Unit Cost, Expiry).");
      return;
    }
    receiveMutation.mutate({
      medicine_id: receiveMedId,
      batch_number: receiveBatchNo.trim(),
      quantity: Number(receiveQty),
      unit_cost: Number(receiveCost),
      expiry_date: receiveExpiry,
      manufacture_date: receiveMfg || undefined,
      supplier_id: receiveSupplierId || undefined,
      invoice_number: receiveInvoice.trim() || undefined,
      notes: receiveNotes.trim() || undefined,
    });
  };

  // -------------------------------------------------------------
  // TAB 3: ADJUST (Audit Adjustment)
  // -------------------------------------------------------------
  const [adjustMedId, setAdjustMedId] = React.useState<string>("");
  const [adjustBatchId, setAdjustBatchId] = React.useState<string>("");
  const [adjustNewQty, setAdjustNewQty] = React.useState<number | "">("");
  const [adjustNotes, setAdjustNotes] = React.useState<string>("");

  const { data: adjustBatchesData } = useQuery({
    queryKey: ["adjust-batches", adjustMedId],
    queryFn: () => apiClient.get<BatchOption[]>(`/api/batches?medicineId=${adjustMedId}`),
    enabled: !!adjustMedId,
  });
  const adjustBatches = adjustBatchesData?.data || [];
  const selectedAdjustBatch = adjustBatches.find((b) => b.id === adjustBatchId);

  const adjustMutation = useMutation({
    mutationFn: (data: { batch_id: string; new_quantity: number; notes: string }) =>
      apiClient.post("/api/stock/adjust", data),
    onSuccess: () => {
      toast.success("Batch quantity adjusted and recorded in audit ledger.");
      setAdjustNewQty("");
      setAdjustNotes("");
      setAdjustBatchId("");
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["adjust-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust batch.");
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBatchId || adjustNewQty === "" || typeof adjustNewQty !== "number" || adjustNewQty < 0) {
      toast.error("Please select a batch and enter a valid non-negative quantity.");
      return;
    }
    if (!adjustNotes.trim()) {
      toast.error("Reason notes are required for audit trail compliance.");
      return;
    }
    adjustMutation.mutate({
      batch_id: adjustBatchId,
      new_quantity: adjustNewQty,
      notes: adjustNotes.trim(),
    });
  };

  // -------------------------------------------------------------
  // TAB 4: MOVEMENT LOG (Audit Trail)
  // -------------------------------------------------------------
  const [logPage, setLogPage] = React.useState(1);
  const [logType, setLogType] = React.useState<string>("all");
  const [logReason, setLogReason] = React.useState<string>("all");

  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["stock-movements", logPage, logType, logReason],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", logPage.toString());
      params.set("pageSize", "15");
      if (logType !== "all") params.set("type", logType);
      if (logReason !== "all") params.set("reason", logReason);
      return apiClient.get<MovementRow[]>(`/api/stock/movements?${params.toString()}`);
    },
  });

  const movements = movementsData?.data || [];
  const logMeta = movementsData?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Stock Management</h1>
        <p className="text-sm text-muted-foreground">
          Dispense medicines via automatic FEFO protocol, receive batches, perform audit adjustments, and inspect the immutable stock ledger.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="dispense" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            <span>Dispense Stock (FEFO)</span>
          </TabsTrigger>
          <TabsTrigger value="receive" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            <span>Receive Stock</span>
          </TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Audit Adjustment</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Movement Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DISPENSE STOCK */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="dispense" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <Card className="lg:col-span-6 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-navy">Dispense Protocol</CardTitle>
                  <Badge variant="outline" className="border-primary text-primary">
                    <Sparkles className="h-3 w-3 mr-1" /> Automated FEFO
                  </Badge>
                </div>
                <CardDescription>
                  Batches are automatically consumed in First-Expire, First-Out sequence. Expired batches are excluded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDispenseSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dispense-med">Medicine</Label>
                    <Select
                      value={dispenseMedId}
                      onValueChange={(val) => {
                        setDispenseMedId(val);
                        setDispenseResult(null);
                      }}
                    >
                      <SelectTrigger id="dispense-med">
                        <SelectValue placeholder="Select medicine to dispense..." />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} {m.strength} ({m.dosage_form}) — {m.sellable_quantity} available
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMed && (
                    <div className="rounded-md bg-blue-50/60 p-3 border border-blue-200/60 text-xs text-blue-900 flex justify-between items-center">
                      <span>Currently Available (Non-expired):</span>
                      <span className="font-bold text-sm">{selectedMed.sellable_quantity} units</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispense-qty">Quantity to Dispense</Label>
                      <Input
                        id="dispense-qty"
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={dispenseQty}
                        onChange={(e) => setDispenseQty(e.target.value ? parseInt(e.target.value) : "")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispense-reason">Dispense Reason</Label>
                      <Select
                        value={dispenseReason}
                        onValueChange={(val: any) => setDispenseReason(val)}
                      >
                        <SelectTrigger id="dispense-reason">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DISPENSE">Clinical Dispense</SelectItem>
                          <SelectItem value="SALE">Counter Sale</SelectItem>
                          <SelectItem value="DAMAGED">Damaged / Discarded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dispense-notes">Notes / Prescription Reference (Optional)</Label>
                    <Textarea
                      id="dispense-notes"
                      rows={2}
                      placeholder="e.g. Patient OPD #1042 or ward allocation"
                      value={dispenseNotes}
                      onChange={(e) => setDispenseNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white"
                    disabled={
                      dispenseMutation.isPending ||
                      !dispenseMedId ||
                      !dispenseQty ||
                      (fefoPreview?.success === false)
                    }
                  >
                    {dispenseMutation.isPending ? "Dispensing..." : "Execute Dispense"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FEFO Live Allocation Preview & Result Panel */}
            <div className="lg:col-span-6 space-y-4">
              {/* Live Preview Card */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-navy flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal" />
                    Live FEFO Allocation Preview
                  </CardTitle>
                  <CardDescription>
                    Real-time breakdown of candidate batches sorted by nearest expiry date.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!dispenseMedId ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
                      Select a medicine to view batch allocation.
                    </div>
                  ) : isLoadingMedBatches ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Calculating available batches...
                    </div>
                  ) : fefoPreview && !fefoPreview.success ? (
                    <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Insufficient Stock</div>
                        <div className="text-xs text-red-700 mt-0.5">
                          {fefoPreview.error}
                        </div>
                      </div>
                    </div>
                  ) : fefoPreview && fefoPreview.success ? (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        FEFO will fulfill <span className="font-semibold text-navy">{dispenseQty} units</span> across {fefoPreview.allocations.length} batch(es):
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs">Batch No</TableHead>
                              <TableHead className="text-xs">Expiry</TableHead>
                              <TableHead className="text-xs text-right">Deducted</TableHead>
                              <TableHead className="text-xs text-right">Remaining</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fefoPreview.allocations.map((alloc) => (
                              <TableRow key={alloc.batchId}>
                                <TableCell className="font-mono text-xs font-medium">
                                  {alloc.batchNumber}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {format(parseISO(alloc.expiryDate), "MM/yyyy")}
                                </TableCell>
                                <TableCell className="text-xs text-right font-bold text-primary">
                                  -{alloc.taken}
                                </TableCell>
                                <TableCell className="text-xs text-right text-muted-foreground">
                                  {alloc.remainingInBatch}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
                      Enter quantity to view live allocation preview.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Execution Result Card (Post Dispense) */}
              {dispenseResult && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Dispense Completed Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-green-800">
                      Dispensed <span className="font-semibold">{dispenseResult.dispensed} units</span> across {dispenseResult.batches.length} batch(es).
                    </p>
                    <div className="bg-white rounded border border-green-200 p-2 space-y-1">
                      {dispenseResult.batches.map((b, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-0.5">
                          <span className="font-mono font-medium">{b.batch_number} (Exp: {b.expiry_date})</span>
                          <span>Deducted: <strong>{b.taken}</strong> | Left: {b.remaining_in_batch}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: RECEIVE STOCK */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="receive">
          <Card className="max-w-3xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-navy">Receive Batch Stock</CardTitle>
              <CardDescription>
                Record incoming stock for a single medicine item. Automatically registers batch, increments stock, and writes to audit ledger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReceiveSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="receive-med">Medicine *</Label>
                    <Select value={receiveMedId} onValueChange={setReceiveMedId}>
                      <SelectTrigger id="receive-med">
                        <SelectValue placeholder="Select medicine to receive..." />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} {m.strength} ({m.dosage_form})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-batch">Batch Number *</Label>
                    <Input
                      id="receive-batch"
                      placeholder="e.g. PCM-2411A"
                      value={receiveBatchNo}
                      onChange={(e) => setReceiveBatchNo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-supplier">Supplier</Label>
                    <Select value={receiveSupplierId} onValueChange={setReceiveSupplierId}>
                      <SelectTrigger id="receive-supplier">
                        <SelectValue placeholder="Select supplier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-qty">Received Quantity *</Label>
                    <Input
                      id="receive-qty"
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value ? parseInt(e.target.value) : "")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-cost">Unit Purchase Price (INR ₹) *</Label>
                    <Input
                      id="receive-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 12.50"
                      value={receiveCost}
                      onChange={(e) => setReceiveCost(e.target.value ? parseFloat(e.target.value) : "")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-expiry">Expiry Date *</Label>
                    <Input
                      id="receive-expiry"
                      type="date"
                      value={receiveExpiry}
                      onChange={(e) => setReceiveExpiry(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-mfg">Manufacture Date (Optional)</Label>
                    <Input
                      id="receive-mfg"
                      type="date"
                      value={receiveMfg}
                      onChange={(e) => setReceiveMfg(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-inv">Invoice / DC Reference</Label>
                    <Input
                      id="receive-inv"
                      placeholder="e.g. INV-9042"
                      value={receiveInvoice}
                      onChange={(e) => setReceiveInvoice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receive-notes">Remarks</Label>
                    <Input
                      id="receive-notes"
                      placeholder="e.g. Delivered in cold chain container"
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-white"
                    disabled={receiveMutation.isPending}
                  >
                    {receiveMutation.isPending ? "Receiving Batch..." : "Record Incoming Batch"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: ADJUST STOCK */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="adjust">
          <Card className="max-w-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-navy">Audit Stock Adjustment</CardTitle>
              <CardDescription>
                Correct physical stock discrepancies. Every adjustment is recorded in the immutable audit trail with mandatory justification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjust-med">1. Select Medicine</Label>
                  <Select
                    value={adjustMedId}
                    onValueChange={(val) => {
                      setAdjustMedId(val);
                      setAdjustBatchId("");
                    }}
                  >
                    <SelectTrigger id="adjust-med">
                      <SelectValue placeholder="Select medicine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.strength}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {adjustMedId && (
                  <div className="space-y-2">
                    <Label htmlFor="adjust-batch">2. Select Batch to Adjust</Label>
                    <Select value={adjustBatchId} onValueChange={setAdjustBatchId}>
                      <SelectTrigger id="adjust-batch">
                        <SelectValue placeholder="Select batch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            Batch {b.batch_number} — Current: {b.quantity} units (Exp: {b.expiry_date})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedAdjustBatch && (
                  <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground flex justify-between">
                    <span>Batch <strong>{selectedAdjustBatch.batch_number}</strong> current quantity:</span>
                    <span className="font-bold text-navy text-sm">{selectedAdjustBatch.quantity} units</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="adjust-qty">3. New Verified Physical Quantity *</Label>
                  <Input
                    id="adjust-qty"
                    type="number"
                    min="0"
                    placeholder="Enter new verified stock count"
                    value={adjustNewQty}
                    onChange={(e) => setAdjustNewQty(e.target.value !== "" ? parseInt(e.target.value) : "")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-notes">4. Reason for Adjustment * (Audit Compliance)</Label>
                  <Textarea
                    id="adjust-notes"
                    rows={3}
                    placeholder="Mandatory explanation: e.g. Physical stock audit verified count discrepancy, or container leakage."
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white"
                  disabled={adjustMutation.isPending || !adjustBatchId || adjustNewQty === "" || !adjustNotes.trim()}
                >
                  {adjustMutation.isPending ? "Adjusting..." : "Commit Stock Adjustment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MOVEMENT LOG */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="log" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-navy">Audit Ledger Movements</CardTitle>
                  <CardDescription>
                    Complete tamper-evident log of all stock movements. Protected by database trigger immutability.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={logType} onValueChange={(val) => { setLogType(val); setLogPage(1); }}>
                    <SelectTrigger className="w-[120px] text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="IN">Stock IN</SelectItem>
                      <SelectItem value="OUT">Stock OUT</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={logReason} onValueChange={(val) => { setLogReason(val); setLogPage(1); }}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="All Reasons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reasons</SelectItem>
                      {MOVEMENT_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Timestamp</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs">Medicine</TableHead>
                      <TableHead className="text-xs">Batch</TableHead>
                      <TableHead className="text-xs text-right">Quantity</TableHead>
                      <TableHead className="text-xs text-right">Balance After</TableHead>
                      <TableHead className="text-xs">Performed By</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMovements ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                          Loading audit ledger...
                        </TableCell>
                      </TableRow>
                    ) : movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                          No movements found matching the current filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                m.movement_type === "IN"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                            >
                              {m.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {m.reason}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-navy">
                            {m.medicine?.name} {m.medicine?.strength}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {m.batch?.batch_number || "—"}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-bold ${
                            m.movement_type === "IN" ? "text-green-700" : "text-red-700"
                          }`}>
                            {m.movement_type === "IN" ? `+${m.quantity}` : `-${m.quantity}`}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {m.batch_balance_after}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {m.user?.full_name || "System"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={m.notes || ""}>
                            {m.notes || "—"}
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
                  Showing page {logMeta.page} of {logMeta.totalPages} ({logMeta.total} total movements)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage >= (logMeta.totalPages || 1)}
                    onClick={() => setLogPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
