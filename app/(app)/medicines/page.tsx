"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Package,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { medicineSchema, MedicineInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DOSAGE_FORMS, STOCK_STATUSES } from "@/lib/constants";
import { Category, MedicineStockView, Supplier } from "@/types/database";
import { toast } from "sonner";

export default function MedicinesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineStockView | null>(null);
  const [deactivatingMedicine, setDeactivatingMedicine] = useState<MedicineStockView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Categories & Suppliers for filter and form selects
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiClient<Category[]>("/api/categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await apiClient<Supplier[]>("/api/suppliers", { params: { pageSize: 100 } });
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Query Medicines
  const { data: medicinesResponse, isLoading } = useQuery({
    queryKey: [
      "medicines",
      {
        search: debouncedSearch,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        supplier: selectedSupplier === "all" ? undefined : selectedSupplier,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        page: currentPage,
        sort: sortField,
        order: sortOrder,
      },
    ],
    queryFn: async () => {
      const res = await apiClient<MedicineStockView[]>("/api/medicines", {
        params: {
          search: debouncedSearch || undefined,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          supplier: selectedSupplier === "all" ? undefined : selectedSupplier,
          status: selectedStatus === "all" ? undefined : selectedStatus,
          page: currentPage,
          pageSize: 20,
          sort: sortField,
          order: sortOrder,
        },
      });
      return res;
    },
  });

  const medicines = medicinesResponse?.data || [];
  const meta = medicinesResponse?.meta || { total: 0, totalPages: 1 };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: "",
      generic_name: "",
      category_id: "",
      strength: "",
      dosage_form: "Tablet",
      unit_price: 0,
      reorder_level: 20,
      default_supplier_id: "",
      description: "",
    },
  });

  const openAddModal = () => {
    setEditingMedicine(null);
    setFormError(null);
    reset({
      name: "",
      generic_name: "",
      category_id: "",
      strength: "",
      dosage_form: "Tablet",
      unit_price: 0,
      reorder_level: 20,
      default_supplier_id: "",
      description: "",
    });
    setIsFormOpen(true);
  };

  const openEditModal = (m: MedicineStockView) => {
    setEditingMedicine(m);
    setFormError(null);
    reset({
      name: m.name,
      generic_name: m.generic_name || "",
      category_id: m.category_id || "",
      strength: m.strength,
      dosage_form: m.dosage_form,
      unit_price: Number(m.unit_price),
      reorder_level: m.reorder_level,
      default_supplier_id: m.default_supplier_id || "",
      description: m.description || "",
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (values: MedicineInput) => {
    setFormError(null);
    try {
      if (editingMedicine) {
        await apiClient(`/api/medicines/${editingMedicine.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        toast.success(`Medicine "${values.name}" updated successfully.`);
      } else {
        await apiClient("/api/medicines", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success(`Medicine "${values.name}" added to database.`);
      }

      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to save medicine. Please check the values.");
      }
    }
  };

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/api/medicines/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Medicine deactivated successfully.");
      setDeactivatingMedicine(null);
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to deactivate medicine.");
      }
      setDeactivatingMedicine(null);
    },
  });

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await apiClient<Blob>("/api/reports/stock-summary?format=csv");
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-summary-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Stock summary CSV downloaded.");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-navy">
            Medicine Inventory
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage pharmaceutical catalog, strengths, dosage forms, and reorder levels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs text-navy border-slate-300"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={openAddModal}
            className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, generic, strength..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Supplier Filter */}
          <Select
            value={selectedSupplier}
            onValueChange={(val) => {
              setSelectedSupplier(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="NEAR_EXPIRY">Near Expiry</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Medicines Table */}
      <div className="bg-white rounded-lg border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold text-navy">No medicines found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No pharmaceutical formulations match your current search and filter criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSelectedCategory("all");
                setSelectedSupplier("all");
                setSelectedStatus("all");
              }}
              className="mt-4 h-8 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      <span>Medicine & Formulation</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("sellable_quantity")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Stock (Sellable)</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Reorder Lvl</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("unit_price")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Unit Price</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Earliest Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <Link href={`/medicines/${m.id}`} className="font-semibold text-navy hover:underline">
                        {m.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {m.strength} • {m.dosage_form}
                        {m.generic_name && ` • (${m.generic_name})`}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {m.category_name || "Uncategorized"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-navy">
                      {m.sellable_quantity}
                      {m.expired_quantity > 0 && (
                        <span className="block text-[10px] text-[#B42318] font-normal">
                          +{m.expired_quantity} expired
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-slate-500">
                      {m.reorder_level}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ₹{Number(m.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {m.earliest_expiry ? format(parseISO(m.earliest_expiry), "MM/yyyy") : "None"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.stock_status} hasNearExpiry={m.has_near_expiry} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs shadow-md">
                          <DropdownMenuItem asChild>
                            <Link href={`/medicines/${m.id}`} className="cursor-pointer">
                              <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              View Batches
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(m)} className="cursor-pointer">
                            <Edit className="h-3.5 w-3.5 mr-2 text-primary" />
                            Edit Medicine
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => setDeactivatingMedicine(m)}
                              className="text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {medicines.length} of {meta.total} medicines
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <span className="font-medium text-navy">
              Page {currentPage} of {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= (meta.totalPages || 1)}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Medicine Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy">
              {editingMedicine ? "Edit Medicine Formulary" : "Register New Medicine"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ensure accurate generic name, dosage form, and reorder trigger levels.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-md bg-[#FDE7E5] border border-[#B42318]/30 text-xs text-[#B42318]">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold text-navy">
                  Medicine Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Paracetamol"
                  className={errors.name ? "border-destructive h-9 text-xs" : "h-9 text-xs"}
                  {...register("name")}
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="generic_name" className="text-xs font-semibold text-navy">
                  Generic / Salt Name
                </Label>
                <Input
                  id="generic_name"
                  placeholder="e.g. Acetaminophen"
                  className="h-9 text-xs"
                  {...register("generic_name")}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="strength" className="text-xs font-semibold text-navy">
                  Strength / Concentration *
                </Label>
                <Input
                  id="strength"
                  placeholder="e.g. 500mg, 100ml"
                  className={errors.strength ? "border-destructive h-9 text-xs" : "h-9 text-xs"}
                  {...register("strength")}
                />
                {errors.strength && <p className="text-[11px] text-destructive">{errors.strength.message}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-navy">Dosage Form *</Label>
                <Select
                  defaultValue={editingMedicine?.dosage_form || "Tablet"}
                  onValueChange={(val) => setValue("dosage_form", val as any)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSAGE_FORMS.map((form) => (
                      <SelectItem key={form} value={form}>
                        {form}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-navy">Category</Label>
                <Select
                  defaultValue={editingMedicine?.category_id || undefined}
                  onValueChange={(val) => setValue("category_id", val === "none" ? null : val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-navy">Default Vendor</Label>
                <Select
                  defaultValue={editingMedicine?.default_supplier_id || undefined}
                  onValueChange={(val) => setValue("default_supplier_id", val === "none" ? null : val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="unit_price" className="text-xs font-semibold text-navy">
                  Selling Price (₹) *
                </Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  className="h-9 text-xs"
                  {...register("unit_price")}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="reorder_level" className="text-xs font-semibold text-navy">
                  Reorder Threshold Level *
                </Label>
                <Input
                  id="reorder_level"
                  type="number"
                  className="h-9 text-xs"
                  {...register("reorder_level")}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="description" className="text-xs font-semibold text-navy">
                  Clinical Notes / Indications
                </Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Optional indication or storage requirements..."
                  className="text-xs"
                  {...register("description")}
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-clinical-blue hover:bg-clinical-blueHover text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : editingMedicine ? (
                  "Update Medicine"
                ) : (
                  "Add Medicine"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!deactivatingMedicine}
        onOpenChange={(open) => !open && setDeactivatingMedicine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy">
              Deactivate Medicine Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to deactivate{" "}
              <strong className="text-navy font-semibold">
                {deactivatingMedicine?.name} {deactivatingMedicine?.strength}
              </strong>
              ? Deactivated medicines cannot receive stock purchases.
              <span className="block mt-2 text-[#B42318]">
                Note: Deactivation will be rejected if sellable or expired stock remains in inventory.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivatingMedicine && deactivateMutation.mutate(deactivatingMedicine.id)}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Deactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
