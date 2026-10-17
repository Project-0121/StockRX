"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShoppingCart,
  ArrowDownLeft,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface AlertsResponse {
  counts: {
    lowStock: number;
    nearExpiry: number;
    expired: number;
    total: number;
  };
  lowStock: Array<{
    id: string;
    name: string;
    strength: string;
    dosage_form: string;
    category_name: string;
    supplier_name: string | null;
    sellable_quantity: number;
    reorder_level: number;
    deficit: number;
  }>;
  nearExpiry: Array<{
    id: string;
    medicine_name: string;
    strength: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    days_to_expiry: number;
  }>;
  expired: Array<{
    id: string;
    medicine_name: string;
    strength: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
  }>;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [writingOffBatch, setWritingOffBatch] = React.useState<{ id: string; batch_number: string; medicine_name: string; quantity: number } | null>(null);

  const { data: userMe } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<{ profile: { role: string } }>("/api/auth/me"),
  });
  const isAdmin = userMe?.data.profile.role === "admin";

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiClient.get<AlertsResponse>("/api/alerts"),
  });

  const alerts = alertsData?.data;

  const writeOffMutation = useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post("/api/stock/write-off", { batch_id: batchId }),
    onSuccess: () => {
      toast.success("Expired batch disposed and removed from alerts.");
      setWritingOffBatch(null);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-expired"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to write off expired batch.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Inventory Alerts & Action Center</h1>
        <p className="text-sm text-muted-foreground">
          Critical attention items: items requiring reorder, upcoming shelf-life expiries, and quarantined batches.
        </p>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-900 uppercase">Low Stock Deficits</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">{alerts?.counts.lowStock ?? 0}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">Below critical safety reorder level</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600 opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-orange-900 uppercase">Near Expiry Batches</div>
              <div className="text-2xl font-bold text-orange-900 mt-1">{alerts?.counts.nearExpiry ?? 0}</div>
              <div className="text-[11px] text-orange-700 mt-0.5">Expiring within active window</div>
            </div>
            <Clock className="h-8 w-8 text-orange-600 opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-red-900 uppercase">Expired Batches</div>
              <div className="text-2xl font-bold text-red-900 mt-1">{alerts?.counts.expired ?? 0}</div>
              <div className="text-[11px] text-red-700 mt-0.5">Require immediate disposal</div>
            </div>
            <ShieldAlert className="h-8 w-8 text-red-600 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Low Stock Items */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Low Stock & Depleted Medicines ({alerts?.lowStock.length ?? 0})
              </CardTitle>
              <CardDescription>
                These medicines have available sellable stock at or below minimum reorder thresholds.
              </CardDescription>
            </div>
            <Link href="/purchases/new">
              <Button size="sm" className="bg-primary hover:bg-primary-hover text-white text-xs">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Reorder Purchase
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Medicine Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs text-right">Available</TableHead>
                  <TableHead className="text-xs text-right">Reorder Level</TableHead>
                  <TableHead className="text-xs text-right">Stock Deficit</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      Scanning stock deficits...
                    </TableCell>
                  </TableRow>
                ) : alerts?.lowStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      All medicine inventories are currently above safety reorder thresholds.
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts?.lowStock.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-semibold text-navy">
                        {m.name} {m.strength}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.category_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.supplier_name || "—"}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-amber-700">
                        {m.sellable_quantity}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {m.reorder_level}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-red-600">
                        -{m.deficit} units
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/medicines/${m.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary-hover">
                            View Stock <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Near Expiry Batches */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Near Expiry Batches ({alerts?.nearExpiry.length ?? 0})
              </CardTitle>
              <CardDescription>
                Batches expiring soon. Prioritize dispensing via FEFO protocol before expiration.
              </CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowDownLeft className="h-3.5 w-3.5 mr-1" /> Open FEFO Dispenser
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Batch No</TableHead>
                  <TableHead className="text-xs text-right">Remaining Qty</TableHead>
                  <TableHead className="text-xs">Expiry Date</TableHead>
                  <TableHead className="text-xs text-right">Days Left</TableHead>
                  <TableHead className="text-xs">Protocol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      Scanning batch expiries...
                    </TableCell>
                  </TableRow>
                ) : alerts?.nearExpiry.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      No batches are currently approaching their shelf-life expiry date.
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts?.nearExpiry.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-semibold text-navy">
                        {b.medicine_name} {b.strength}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">{b.batch_number}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-foreground">
                        {b.quantity}
                      </TableCell>
                      <TableCell className="text-xs">{format(parseISO(b.expiry_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-orange-600">
                        {b.days_to_expiry} days
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[11px]">
                          Priority Dispense
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Expired Batches */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                Quarantined Expired Batches ({alerts?.expired.length ?? 0})
              </CardTitle>
              <CardDescription>
                These batches have passed their expiry date and are automatically locked against dispensing.
              </CardDescription>
            </div>
            <Link href="/expiry">
              <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                Go to Expiry Center
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Batch No</TableHead>
                  <TableHead className="text-xs text-right">Quarantined Qty</TableHead>
                  <TableHead className="text-xs">Expired On</TableHead>
                  <TableHead className="text-xs text-right">Disposal Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                      Scanning expired quarantine...
                    </TableCell>
                  </TableRow>
                ) : alerts?.expired.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                      No expired batches currently in stock.
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts?.expired.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-semibold text-navy">
                        {b.medicine_name} {b.strength}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium text-red-700">{b.batch_number}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-red-700">{b.quantity}</TableCell>
                      <TableCell className="text-xs font-medium text-red-700">
                        {format(parseISO(b.expiry_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setWritingOffBatch(b)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Dispose
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Admin required</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Disposal Modal */}
      <AlertDialog
        open={!!writingOffBatch}
        onOpenChange={(open) => !open && setWritingOffBatch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" /> Confirm Batch Disposal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to write off batch{" "}
              <strong>{writingOffBatch?.batch_number}</strong> of{" "}
              <strong>{writingOffBatch?.medicine_name}</strong> ({writingOffBatch?.quantity} units)?
              <br /><br />
              This will zero the batch quantity and record an immutable <code>OUT / EXPIRED</code> audit entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => writingOffBatch && writeOffMutation.mutate(writingOffBatch.id)}
            >
              Confirm Disposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
