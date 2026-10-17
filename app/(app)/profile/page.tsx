"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  User,
  KeyRound,
  Shield,
  ShieldCheck,
  Mail,
  Calendar,
  Lock,
  CheckCircle,
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
import { Badge } from "@/components/ui/badge";

interface ProfileResponse {
  user: { id: string; email: string };
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "staff";
    is_active: boolean;
    created_at: string;
  };
}

export default function ProfilePage() {
  const { data: meData, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<ProfileResponse>("/api/auth/me"),
  });

  const profile = meData?.data.profile;

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient.post("/api/auth/change-password", data),
    onSuccess: () => {
      toast.success("Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update password.");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">User Profile & Security</h1>
        <p className="text-sm text-muted-foreground">
          View your staff credentials and update your individual account authentication password.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <User className="h-4 w-4 text-teal" /> Account Profile Details
            </CardTitle>
            <CardDescription>
              Your verified dispensary identity in the institutional audit ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !profile ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading profile details...
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Full Name:</div>
                  <div className="font-bold text-navy text-base mt-0.5">{profile.full_name}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Email Address:</div>
                  <div className="font-mono text-foreground mt-0.5">{profile.email}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Access Privilege:</div>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        profile.role === "admin"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }
                    >
                      {profile.role === "admin" ? (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> System Administrator
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" /> Staff (Pharmacist)
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Account Created:</div>
                  <div className="text-muted-foreground mt-0.5">
                    {format(new Date(profile.created_at), "dd MMMM yyyy, HH:mm")}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2.5 rounded-md border border-green-200">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Active session verified with Supabase Authentication.</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-teal" /> Update Access Password
            </CardTitle>
            <CardDescription>
              Ensure your account uses a strong, unique password of at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pwd">Current Password *</Label>
                <Input
                  id="current-pwd"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pwd">New Password (Min 8 chars) *</Label>
                <Input
                  id="new-pwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirm New Password *</Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white"
                  disabled={changePasswordMutation.isPending}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {changePasswordMutation.isPending ? "Updating Password..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
