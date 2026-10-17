"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldCheck, Zap, Crosshair, CheckCircle2, Lock, ArrowRight, Loader2 } from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/schemas";
import { apiClient, ApiError } from "@/lib/api/client";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_TAGLINE, APP_SUBTITLE, DEVELOPER_NAME, DEVELOPER_CREDENTIALS } from "@/lib/constants";
import { toast } from "sonner";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      toast.success("Login successful. Welcome back!");
      router.push(nextPath);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to sign in. Please verify your credentials.");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F4F7FA]">
      {/* Left Clinical Brand Showcase Panel */}
      <div className="w-full md:w-5/12 bg-navy text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden border-r border-[#133B6B]">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Logo size="lg" darkTheme showTagline />

          <div className="mt-12 space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
              Hospital & Retail Pharmacy Inventory Control
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Replacing manual registers with automated First-Expire First-Out (FEFO) dispensing,
              batch traceability, and proactive expiry safeguards.
            </p>

            {/* 4 Value Pillars */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-dark/60 border border-white/10">
                <div className="p-2 rounded bg-primary/20 text-white shrink-0">
                  <Zap className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">Smart</h4>
                  <p className="text-[11px] text-slate-300">Automated FEFO & reorder checks</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-dark/60 border border-white/10">
                <div className="p-2 rounded bg-primary/20 text-white shrink-0">
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">Fast</h4>
                  <p className="text-[11px] text-slate-300">Sub-second batch allocation</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-dark/60 border border-white/10">
                <div className="p-2 rounded bg-primary/20 text-white shrink-0">
                  <Crosshair className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">Accurate</h4>
                  <p className="text-[11px] text-slate-300">Strict ledger consistency</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-dark/60 border border-white/10">
                <div className="p-2 rounded bg-primary/20 text-white shrink-0">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">Reliable</h4>
                  <p className="text-[11px] text-slate-300">Zero expiry dispense guarantee</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Project Credits */}
        <div className="relative z-10 pt-10 border-t border-white/10 mt-10">
          <p className="text-xs text-slate-400 font-medium">
            B.Tech CSE (AI) Capstone Project
          </p>
          <p className="text-sm font-semibold text-slate-200 mt-0.5">
            Developed by {DEVELOPER_NAME} ({DEVELOPER_CREDENTIALS})
          </p>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-14">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-[#DCE3EA] p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy tracking-tight">Staff Authentication</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your pharmacy staff credentials to access inventory.
            </p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 rounded-lg bg-[#FDE7E5] border border-[#B42318]/30 flex items-start gap-3 text-sm text-[#B42318]">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-navy uppercase tracking-wider">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@pharmacy.com"
                autoComplete="email"
                disabled={isSubmitting}
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-navy uppercase tracking-wider">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 font-semibold bg-clinical-blue hover:bg-clinical-blueHover text-white shadow-sm mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Access System
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Authorized staff only security warning */}
          <div className="mt-8 pt-6 border-t border-border flex items-center gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
            <span>Authorized pharmacy personnel only. Public sign-up is disabled.</span>
          </div>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-4 p-3 bg-[#EEF1F5] rounded-md border border-[#DCE3EA] text-xs text-[#475467]">
            <p className="font-semibold text-navy mb-1">Demo Credentials:</p>
            <p>Admin: <span className="font-mono text-navy font-medium">admin@pharmacy.com</span> / <span className="font-mono text-navy font-medium">Admin@123</span></p>
            <p>Staff: <span className="font-mono text-navy font-medium">staff@pharmacy.com</span> / <span className="font-mono text-navy font-medium">Staff@123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F4F7FA]" />}>
      <LoginFormContent />
    </React.Suspense>
  );
}

