import React from "react";
import { APP_NAME, APP_SUBTITLE, DEVELOPER_NAME, DEVELOPER_CREDENTIALS } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-white py-4 px-6 text-center text-xs text-muted-foreground no-print select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>
          &copy; {currentYear} {APP_NAME} - {APP_SUBTITLE}
        </p>
        <p className="font-medium text-slate-600">
          Developed by {DEVELOPER_NAME}, {DEVELOPER_CREDENTIALS}
        </p>
      </div>
    </footer>
  );
}
