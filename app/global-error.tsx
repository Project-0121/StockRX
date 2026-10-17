"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-sm p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Critical System Error</h1>
            <p className="text-sm text-slate-600">
              A critical runtime failure was encountered. Please reload the application.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => reset()}
              className="bg-[#0B5FA5] hover:bg-[#094E8A] text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reload Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
