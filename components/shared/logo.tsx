import React from "react";
import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  darkTheme?: boolean;
}

export function Logo({
  className,
  showTagline = false,
  size = "md",
  darkTheme = false,
}: LogoProps) {
  const iconDimensions = {
    sm: 28,
    md: 36,
    lg: 48,
  }[size];

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className="relative flex items-center justify-center shrink-0">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={iconDimensions}
          height={iconDimensions}
          className="rounded-md object-contain"
          priority
        />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "font-bold tracking-tight font-sans leading-none",
            titleSizes,
            darkTheme ? "text-white" : "text-navy"
          )}
        >
          {APP_NAME}
        </span>
        {showTagline && (
          <span
            className={cn(
              "text-[10px] tracking-wide mt-1 font-medium",
              darkTheme ? "text-slate-300" : "text-muted-foreground"
            )}
          >
            {APP_TAGLINE}
          </span>
        )}
      </div>
    </div>
  );
}
