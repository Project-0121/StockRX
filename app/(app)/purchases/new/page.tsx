"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  Building,
  Receipt,
  CheckCircle,
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

interface MedicineOption {
  id: string;
  name: string;
  strength: string;
  dosage_form: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface PurchaseItemRow {
  medicine_id: string;
  batch_number: string;
  quantity: number | "";
  unit_cost: number | "";
  expiry_date: string;
  manufacture_date: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Suppliers & Medicines lookup
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-lookup"],
    queryFn: () => apiClient.get<SupplierOption[]>("/api/suppliers"),
  });
  const suppliers = suppliersData?.data || [];

  const { data: medicinesData } = useQuery({
    queryKey: ["medicines-lookup"],
    queryFn: () => apiClient.get<MedicineOption[]>("/api/medicines?pageSize=100&includeInactive=false"),
  });
  const medicines = medicinesData?.data || [];

  // Form State
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>("");
  const [purchaseDate, setPurchaseDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = React.useState<string>("");

  const [items, setItems] = React.useState<PurchaseItemRow[]>([
    {
      medicine_id: "",
      batch_number: "",
      quantity: "",
      unit_cost: "",
      expiry_date: "",
      manufacture_date: "",
    },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicine_id: "",
        batch_number: "",
        quantity: "",
        unit_cost: "",
        expiry_date: "",
        manufacture_date: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Purchase order must contain at least one medicine item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Compute live grand total
  const grandTotal = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const q = typeof item.quantity === "number" ? item.quantity : 0;
      const c = typeof item.unit_cost === "number" ? item.unit_cost : 0;
      return sum + q * c;
    }, 0);
  }, [items]);

  const purchaseMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post<{ id: string }>("/api/purchases", payload),
    onSuccess: (res) => {
      toast.success("Purchase order recorded and batches stocked successfully.");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      router.push(`/purchases/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record purchase order.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!purchaseDate) {
      toast.error("Please enter a valid purchase date.");
      return;
    }

    if (items.length === 0) {
      toast.error("At least one item is required.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicine_id) {
        toast.error(`Row ${i + 1}: Please select a medicine.`);
        return;
      }
      if (!item.batch_number.trim()) {
        toast.error(`Row ${i + 1}: Batch number is required.`);
        return;
      }
      if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0) {
        toast.error(`Row ${i + 1}: Quantity must be greater than 0.`);
        return;
      }
      if (item.unit_cost === "" || typeof item.unit_cost !== "number" || item.unit_cost < 0) {
        toast.error(`Row ${i + 1}: Unit cost must be 0 or greater.`);
        return;
      }
      if (!item.expiry_date) {
        toast.error(`Row ${i + 1}: Expiry date is required.`);
        return;
      }
    }

    const payload = {
      supplier_id: supplierId || undefined,
      invoice_number: invoiceNumber.trim() || undefined,
      purchase_date: purchaseDate,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        medicine_id: it.medicine_id,
        batch_number: it.batch_number.trim(),
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost),
        expiry_date: it.expiry_date,
        manufacture_date: it.manufacture_date || undefined,
      })),
    };

    purchaseMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">New Purchase Order</h1>
            <p className="text-sm text-muted-foreground">
              Record incoming stock consignment with dynamic multi-batch lines and invoice verification.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consignment Metadata */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <Receipt className="h-4 w-4 text-teal" /> Consignment & Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup-select">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="sup-select">
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
                <Label htmlFor="inv-no">Vendor Invoice Number</Label>
                <Input
                  id="inv-no"
                  placeholder="e.g. INV-2026-904"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pur-date">Purchase Date *</Label>
                <Input
                  id="pur-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-notes">Remarks / Consignment Notes</Label>
              <Textarea
                id="pur-notes"
                rows={2}
                placeholder="e.g. Delivery received in sealed cardboard containers, cold chain intact."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Item Rows */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-navy">Consignment Medicine Items</CardTitle>
                <CardDescription>
                  Specify medicine, batch number, received quantity, unit cost, and expiry date for each line.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="text-primary border-primary">
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[220px] text-xs">Medicine *</TableHead>
                    <TableHead className="min-w-[130px] text-xs">Batch No *</TableHead>
                    <TableHead className="min-w-[100px] text-xs">Quantity *</TableHead>
                    <TableHead className="min-w-[110px] text-xs">Unit Cost (₹) *</TableHead>
                    <TableHead className="min-w-[130px] text-xs">Expiry Date *</TableHead>
                    <TableHead className="min-w-[130px] text-xs">Mfg Date</TableHead>
                    <TableHead className="min-w-[100px] text-xs text-right">Line Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const lineTotal =
                      typeof item.quantity === "number" && typeof item.unit_cost === "number"
                        ? item.quantity * item.unit_cost
                        : 0;

                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={item.medicine_id}
                            onValueChange={(val) => handleItemChange(idx, "medicine_id", val)}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select medicine..." />
                            </SelectTrigger>
                            <SelectContent>
                              {medicines.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name} {m.strength} ({m.dosage_form})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="PCM-2411A"
                            className="h-9 text-xs font-mono"
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(idx, "batch_number", e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            className="h-9 text-xs"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, "quantity", e.target.value ? parseInt(e.target.value) : "")
                            }
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Price"
                            className="h-9 text-xs"
                            value={item.unit_cost}
                            onChange={(e) =>
                              handleItemChange(idx, "unit_cost", e.target.value ? parseFloat(e.target.value) : "")
                            }
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="h-9 text-xs"
                            value={item.expiry_date}
                            onChange={(e) => handleItemChange(idx, "expiry_date", e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="h-9 text-xs"
                            value={item.manufacture_date}
                            onChange={(e) => handleItemChange(idx, "manufacture_date", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-navy text-xs">
                          ₹{lineTotal.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Grand Total & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Total Line Items: <span className="font-semibold text-navy">{items.length}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Grand Total (INR)</div>
                  <div className="text-2xl font-bold text-navy">₹{grandTotal.toFixed(2)}</div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-white px-8"
                  disabled={purchaseMutation.isPending || items.length === 0}
                >
                  {purchaseMutation.isPending ? "Recording Order..." : "Confirm & Stock In"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
