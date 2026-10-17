import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Footer } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load user profile to verify active status
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_active, role")
    .eq("id", user.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_deactivated");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Left Sidebar in Deep Navy */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
