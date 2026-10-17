"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Settings,
  Building2,
  CalendarClock,
  Boxes,
  Save,
  CheckCircle,
  HelpCircle,
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

interface SettingsData {
  pharmacy_name: string;
  near_expiry_days: string;
  default_reorder_level: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => apiClient.get<SettingsData>("/api/settings"),
  });

  const [pharmacyName, setPharmacyName] = React.useState("");
  const [nearExpiryDays, setNearExpiryDays] = React.useState<number | "">("");
  const [defaultReorder, setDefaultReorder] = React.useState<number | "">("");

  React.useEffect(() => {
    if (settingsData?.data) {
      setPharmacyName(settingsData.data.pharmacy_name || "");
      setNearExpiryDays(parseInt(settingsData.data.near_expiry_days || "60", 10));
      setDefaultReorder(parseInt(settingsData.data.default_reorder_level || "20", 10));
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.patch("/api/settings", data),
    onSuccess: () => {
      toast.success("Application settings saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update settings.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim()) {
      toast.error("Pharmacy facility name cannot be blank.");
      return;
    }
    if (
      typeof nearExpiryDays !== "number" ||
      nearExpiryDays < 1 ||
      nearExpiryDays > 365
    ) {
      toast.error("Near-expiry window must be between 1 and 365 days.");
      return;
    }
    if (
      typeof defaultReorder !== "number" ||
      defaultReorder < 0
    ) {
      toast.error("Default reorder level must be 0 or greater.");
      return;
    }

    updateMutation.mutate({
      pharmacy_name: pharmacyName.trim(),
      near_expiry_days: nearExpiryDays,
      default_reorder_level: defaultReorder,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">System Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage clinical institutional parameters, regulatory expiry warning horizons, and inventory reorder baselines.
        </p>
      </div>

      <div className="max-w-2xl">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <Settings className="h-4 w-4 text-teal" /> General Pharmacy Parameters
            </CardTitle>
            <CardDescription>
              Changes made here update the operational logic across all dispensary screens and reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading configuration values...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pharmacy-name" className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Pharmacy / Facility Legal Name *
                  </Label>
                  <Input
                    id="pharmacy-name"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. PharmaTrack Central Hospital Pharmacy"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This official entity name appears on the sidebar and all exported letterhead reports.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="near-expiry" className="flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    Near Expiry Warning Horizon (Days) *
                  </Label>
                  <Input
                    id="near-expiry"
                    type="number"
                    min="1"
                    max="365"
                    value={nearExpiryDays}
                    onChange={(e) =>
                      setNearExpiryDays(e.target.value ? parseInt(e.target.value, 10) : "")
                    }
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Batches expiring within this number of days trigger &apos;Near Expiry&apos; alerts and warning badges. (Standard clinical protocol: 60 days).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder-level" className="flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    Default Minimum Reorder Level (Units) *
                  </Label>
                  <Input
                    id="reorder-level"
                    type="number"
                    min="0"
                    value={defaultReorder}
                    onChange={(e) =>
                      setDefaultReorder(e.target.value ? parseInt(e.target.value, 10) : "")
                    }
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default threshold pre-filled when registering new medicines. When sellable stock falls below this, a Low Stock alert is flagged.
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-white"
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
