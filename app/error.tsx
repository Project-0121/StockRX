"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log client error safely in console
    console.error("Clinical System Exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-sm p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-navy">Application Exception</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while processing pharmaceutical inventory state.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => reset()}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full bg-primary hover:bg-primary-hover text-white">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
