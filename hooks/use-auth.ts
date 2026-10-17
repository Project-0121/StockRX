"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Profile } from "@/types/database";

interface MeResponse {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiClient<MeResponse>("/api/auth/me");
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
    },
  });

  return {
    user: data?.user || null,
    profile: data?.profile || null,
    role: data?.profile?.role || "staff",
    isAdmin: data?.profile?.role === "admin",
    isLoading,
    error,
    refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
