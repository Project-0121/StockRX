"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  ShieldCheck,
  Edit2,
  Lock,
  Mail,
  UserCheck,
  UserX,
  AlertCircle,
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
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  role: "admin" | "staff";
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data: userMe } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<{ profile: UserProfile }>("/api/auth/me"),
  });
  const currentUserId = userMe?.data.profile.id;

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<UserProfile[]>("/api/users"),
  });
  const users = usersData?.data || [];

  // Create User modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    email: "",
    password: "",
    full_name: "",
    role: "staff" as "admin" | "staff",
  });

  // Edit User modal
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [editForm, setEditForm] = React.useState({
    full_name: "",
    role: "staff" as "admin" | "staff",
    is_active: true,
  });

  // Reset Password modal
  const [resettingUser, setResettingUser] = React.useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const addMutation = useMutation({
    mutationFn: (data: typeof addForm) => apiClient.post("/api/users", data),
    onSuccess: () => {
      toast.success("New user account created successfully.");
      setIsAddOpen(false);
      setAddForm({ email: "", password: "", full_name: "", role: "staff" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user.");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      apiClient.patch(`/api/users/${id}`, data),
    onSuccess: () => {
      toast.success("User account updated successfully.");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiClient.post(`/api/users/${id}/reset-password`, { new_password: password }),
    onSuccess: () => {
      toast.success("User password reset successfully.");
      setResettingUser(null);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset password.");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (addForm.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    addMutation.mutate(addForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.full_name.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }
    editMutation.mutate({ id: editingUser.id, data: editForm });
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    resetPasswordMutation.mutate({ id: resettingUser.id, password: newPassword });
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEditForm({
      full_name: u.full_name,
      role: u.role,
      is_active: u.is_active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Staff & Account Management</h1>
          <p className="text-sm text-muted-foreground">
            Control access roles, provision new dispensary staff accounts, and manage security credentials.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary-hover text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Add Staff Account
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Users className="h-4 w-4 text-teal" /> Authorized Personnel Directory
          </CardTitle>
          <CardDescription>
            System users with role-based access permissions. Public registration is disabled by security policy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Full Name</TableHead>
                  <TableHead className="text-xs">Email / Username</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Joined Date</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Loading user accounts...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs font-semibold text-navy">
                          {u.full_name} {isSelf && <span className="text-primary font-normal">(You)</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.role === "admin"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {u.role === "admin" ? (
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Admin
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Staff (Pharmacist)
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {u.is_active ? "Active" : "Deactivated"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(u.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-navy"
                              onClick={() => openEditModal(u)}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-primary hover:text-primary-hover"
                              onClick={() => {
                                setResettingUser(u);
                                setNewPassword("");
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset Pwd
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="text-navy flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-teal" /> Provision Staff Account
              </DialogTitle>
              <DialogDescription>
                Create a new authorized account. The initial role defaults to Staff (Pharmacist).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-email">Email Address *</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="e.g. ramesh.gupta@pharmacy.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-password">Initial Password (Min 8 chars) *</Label>
                <Input
                  id="add-password"
                  type="password"
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-role">System Role</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(val: any) => setAddForm({ ...addForm, role: val })}
                >
                  <SelectTrigger id="add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff (Pharmacist - Inventory & Dispensing)</SelectItem>
                    <SelectItem value="admin">Administrator (Full Access & Settings)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-white" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-navy flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-teal" /> Modify User Permissions
              </DialogTitle>
              <DialogDescription>
                Update full name, assigned role, or activate/deactivate account access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">System Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val: any) => setEditForm({ ...editForm, role: val })}
                  disabled={editingUser?.id === currentUserId}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff (Pharmacist)</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                {editingUser?.id === currentUserId && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Self-protection rule: You cannot demote your own administrative role.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select
                  value={editForm.is_active ? "active" : "inactive"}
                  onValueChange={(val) => setEditForm({ ...editForm, is_active: val === "active" })}
                  disabled={editingUser?.id === currentUserId}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Permitted)</SelectItem>
                    <SelectItem value="inactive">Deactivated (Banned)</SelectItem>
                  </SelectContent>
                </Select>
                {editingUser?.id === currentUserId && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Self-protection rule: You cannot deactivate your own active session.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-white" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleResetSubmit}>
            <DialogHeader>
              <DialogTitle className="text-navy flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-teal" /> Administrative Password Reset
              </DialogTitle>
              <DialogDescription>
                Assign a new password for <strong>{resettingUser?.full_name}</strong> ({resettingUser?.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-pwd">New Password (Min 8 characters) *</Label>
                <Input
                  id="reset-pwd"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResettingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-white" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Updating Password..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
