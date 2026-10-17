"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  History,
  AlertCircle,
  Eye,
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
import { Badge } from "@/components/ui/badge";

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  purchases_count?: number;
}

interface SupplierDetail extends Supplier {
  purchases: Array<{
    id: string;
    invoice_number: string | null;
    purchase_date: string;
    total_cost: number;
    created_at: string;
  }>;
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  // User auth state to check role
  const { data: userMe } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<{ profile: { role: string } }>("/api/auth/me"),
  });
  const isAdmin = userMe?.data.profile.role === "admin";

  // Suppliers query
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiClient.get<Supplier[]>("/api/suppliers"),
  });
  const suppliers = suppliersData?.data || [];

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  const [detailSupplierId, setDetailSupplierId] = React.useState<string | null>(null);
  const [deactivatingSupplier, setDeactivatingSupplier] = React.useState<Supplier | null>(null);

  // Supplier detail query
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["supplier-detail", detailSupplierId],
    queryFn: () => apiClient.get<SupplierDetail>(`/api/suppliers/${detailSupplierId}`),
    enabled: !!detailSupplierId,
  });

  const openAddDialog = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    });
    setIsAddEditOpen(true);
  };

  const openEditDialog = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
    });
    setIsAddEditOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingSupplier) {
        return apiClient.patch(`/api/suppliers/${editingSupplier.id}`, data);
      }
      return apiClient.post("/api/suppliers", data);
    },
    onSuccess: () => {
      toast.success(editingSupplier ? "Supplier updated successfully." : "Supplier created successfully.");
      setIsAddEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-lookup"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save supplier.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/suppliers/${id}`),
    onSuccess: () => {
      toast.success("Supplier deactivated successfully.");
      setDeactivatingSupplier(null);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-lookup"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to deactivate supplier.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }
    saveMutation.mutate({
      name: formData.name.trim(),
      contact_person: formData.contact_person.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Approved Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Directory of verified pharmaceutical distributors and manufacturing wholesalers.
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-primary hover:bg-primary-hover text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Truck className="h-4 w-4 text-teal" />
            Vendor Directory
          </CardTitle>
          <CardDescription>
            Active suppliers linked to medicine procurement contracts and batch receipt history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Supplier Name</TableHead>
                  <TableHead className="text-xs">Contact Person</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Address</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Loading supplier directory...
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      No suppliers registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-semibold text-navy">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.contact_person || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.email || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={s.address || ""}>
                        {s.address || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-300"
                          }
                        >
                          {s.is_active ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-navy"
                            onClick={() => setDetailSupplierId(s.id)}
                            title="View procurement history"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-navy"
                            onClick={() => openEditDialog(s)}
                            title="Edit supplier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {isAdmin && s.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeactivatingSupplier(s)}
                              title="Deactivate supplier (Admin only)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-navy">
                {editingSupplier ? "Edit Supplier" : "Register New Supplier"}
              </DialogTitle>
              <DialogDescription>
                Maintain accurate procurement contacts and billing information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sup-name">Supplier / Distributor Name *</Label>
                <Input
                  id="sup-name"
                  placeholder="e.g. MedLife Distributors Pvt Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sup-contact">Contact Person</Label>
                  <Input
                    id="sup-contact"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sup-phone">Phone Number</Label>
                  <Input
                    id="sup-phone"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-email">Email Address</Label>
                <Input
                  id="sup-email"
                  type="email"
                  placeholder="e.g. orders@medlifedist.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-address">Warehouse / Registered Address</Label>
                <Textarea
                  id="sup-address"
                  rows={2}
                  placeholder="e.g. Plot 42, Okhla Phase III, New Delhi 110020"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingSupplier ? "Update Supplier" : "Register Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail & Purchase History Dialog */}
      <Dialog open={!!detailSupplierId} onOpenChange={(open) => !open && setDetailSupplierId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy flex items-center gap-2">
              <Building className="h-5 w-5 text-teal" />
              Supplier Procurement Dossier
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail || !detailData ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading supplier details...</div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="bg-muted/40 p-4 rounded-lg border border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground">Supplier Name:</div>
                  <div className="font-semibold text-navy text-sm mt-0.5">{detailData.data.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Contact Person:</div>
                  <div className="font-medium text-foreground mt-0.5">{detailData.data.contact_person || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Phone & Email:</div>
                  <div className="font-medium text-foreground mt-0.5">
                    {detailData.data.phone || "—"} • {detailData.data.email || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Address:</div>
                  <div className="font-medium text-foreground mt-0.5">{detailData.data.address || "—"}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-navy mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Purchase Invoices History
                </h4>
                {detailData.data.purchases?.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-md">
                    No purchase invoices recorded for this supplier.
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Invoice #</TableHead>
                          <TableHead className="text-xs">Purchase Date</TableHead>
                          <TableHead className="text-xs text-right">Total (INR ₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.data.purchases?.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs font-mono font-medium">
                              {p.invoice_number || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(parseISO(p.purchase_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-navy">
                              ₹{p.total_cost.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivatingSupplier}
        onOpenChange={(open) => !open && setDeactivatingSupplier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" /> Deactivate Supplier
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{deactivatingSupplier?.name}</strong>? They will no longer be available for new purchase orders, but past batch records will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deactivatingSupplier && deactivateMutation.mutate(deactivatingSupplier.id)}
            >
              Confirm Deactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
