"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  Trash2,
  Calendar,
  Layers,
  ShieldAlert,
  AlertCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ExpiryBatch {
  id: string;
  medicine_id: string;
  medicine_name: string;
  strength: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  days_to_expiry: number;
  expiry_status: "EXPIRED" | "NEAR_EXPIRY" | "SAFE";
  supplier_name: string | null;
}

export default function ExpiryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("near-expiry");
  const [daysFilter, setDaysFilter] = React.useState<"30" | "60" | "90">("60");
  const [writingOffBatch, setWritingOffBatch] = React.useState<ExpiryBatch | null>(null);

  // Check admin role
  const { data: userMe } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<{ profile: { role: string } }>("/api/auth/me"),
  });
  const isAdmin = userMe?.data.profile.role === "admin";

  // Query Near Expiry batches
  const { data: nearExpiryData, isLoading: isLoadingNear } = useQuery({
    queryKey: ["expiry-near", daysFilter],
    queryFn: () => apiClient.get<ExpiryBatch[]>(`/api/expiry/near?days=${daysFilter}`),
  });
  const nearBatches = nearExpiryData?.data || [];

  // Query Expired batches
  const { data: expiredData, isLoading: isLoadingExpired } = useQuery({
    queryKey: ["expiry-expired"],
    queryFn: () => apiClient.get<ExpiryBatch[]>("/api/expiry/expired"),
  });
  const expiredBatches = expiredData?.data || [];

  // Mutation to write off expired batch
  const writeOffMutation = useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post("/api/stock/write-off", { batch_id: batchId }),
    onSuccess: () => {
      toast.success("Expired batch written off and quarantined from inventory.");
      setWritingOffBatch(null);
      queryClient.invalidateQueries({ queryKey: ["expiry-expired"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-near"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to write off batch.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Expiry Management</h1>
        <p className="text-sm text-muted-foreground">
          Track time-sensitive pharmaceutical batches, monitor near-expiry thresholds, and dispose of expired stocks safely.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="near-expiry" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span>Near Expiry Batches</span>
            {nearBatches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-orange-100 text-orange-800">
                {nearBatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>Expired Batches</span>
            {expiredBatches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-red-100 text-red-800">
                {expiredBatches.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: NEAR EXPIRY BATCHES */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="near-expiry" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-navy flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" /> Batches Expiring Soon
                  </CardTitle>
                  <CardDescription>
                    Batches expiring within the selected window. Prioritize these batches for clinical dispensing.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Time Window:</span>
                  <Select
                    value={daysFilter}
                    onValueChange={(val: any) => setDaysFilter(val)}
                  >
                    <SelectTrigger className="w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Within 30 Days</SelectItem>
                      <SelectItem value="60">Within 60 Days</SelectItem>
                      <SelectItem value="90">Within 90 Days</SelectItem>
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
                      <TableHead className="text-xs">Medicine</TableHead>
                      <TableHead className="text-xs">Batch No</TableHead>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs text-right">Available Qty</TableHead>
                      <TableHead className="text-xs">Expiry Date</TableHead>
                      <TableHead className="text-xs text-right">Days Remaining</TableHead>
                      <TableHead className="text-xs">Action Strategy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingNear ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                          Scanning near-expiry inventory...
                        </TableCell>
                      </TableRow>
                    ) : nearBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                          No batches found expiring within {daysFilter} days.
                        </TableCell>
                      </TableRow>
                    ) : (
                      nearBatches.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-semibold text-navy">
                            {b.medicine_name} {b.strength}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium">
                            {b.batch_number}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {b.supplier_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-foreground">
                            {b.quantity}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(parseISO(b.expiry_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-orange-600">
                            {b.days_to_expiry} days
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                              Priority Dispense (FEFO)
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
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: EXPIRED BATCHES */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="expired" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" /> Expired Stock Quarantine
              </CardTitle>
              <CardDescription>
                These batches have passed their expiry date and are automatically excluded from dispensing.
                Authorized administrators must execute disposal write-offs to zero the batch count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Medicine</TableHead>
                      <TableHead className="text-xs">Batch No</TableHead>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs text-right">Expired Qty</TableHead>
                      <TableHead className="text-xs">Expired On</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Disposal Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingExpired ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                          Loading expired quarantine list...
                        </TableCell>
                      </TableRow>
                    ) : expiredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                          No expired batches currently in stock.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiredBatches.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-semibold text-navy">
                            {b.medicine_name} {b.strength}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium text-red-700">
                            {b.batch_number}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {b.supplier_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-red-700">
                            {b.quantity}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-red-700">
                            {format(parseISO(b.expiry_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                              Quarantined
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => setWritingOffBatch(b)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Write Off
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
        </TabsContent>
      </Tabs>

      {/* Write Off Confirmation Modal */}
      <AlertDialog
        open={!!writingOffBatch}
        onOpenChange={(open) => !open && setWritingOffBatch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" /> Confirm Batch Write-Off & Disposal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to write off batch{" "}
              <strong>{writingOffBatch?.batch_number}</strong> of{" "}
              <strong>{writingOffBatch?.medicine_name}</strong> ({writingOffBatch?.quantity} units)?
              <br /><br />
              This will reduce the batch quantity to 0 and record an immutable <code>OUT / EXPIRED</code> entry in the audit ledger. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => writingOffBatch && writeOffMutation.mutate(writingOffBatch.id)}
            >
              Confirm Write-Off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
