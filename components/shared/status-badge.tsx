import React from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StockStatus, ExpiryStatus } from "@/types/database";

interface StatusBadgeProps {
  status: StockStatus | ExpiryStatus | string;
  hasNearExpiry?: boolean;
  className?: string;
}

export function StatusBadge({ status, hasNearExpiry, className }: StatusBadgeProps) {
  let badgeContent = null;
  let variant: "available" | "lowStock" | "nearExpiry" | "expired" | "outOfStock" | "default" = "default";

  switch (status) {
    case "AVAILABLE":
    case "SAFE":
      variant = "available";
      badgeContent = (
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-[#1E8E5A]" />
          <span>Available</span>
        </span>
      );
      break;

    case "LOW_STOCK":
      variant = "lowStock";
      badgeContent = (
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-[#B7791F]" />
          <span>Low Stock</span>
        </span>
      );
      break;

    case "NEAR_EXPIRY":
      variant = "nearExpiry";
      badgeContent = (
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-[#C2570C]" />
          <span>Near Expiry</span>
        </span>
      );
      break;

    case "EXPIRED":
      variant = "expired";
      badgeContent = (
        <span className="flex items-center gap-1.5">
          <XCircle className="h-3 w-3 text-[#B42318]" />
          <span>Expired</span>
        </span>
      );
      break;

    case "OUT_OF_STOCK":
      variant = "outOfStock";
      badgeContent = (
        <span className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-[#475467]" />
          <span>Out of Stock</span>
        </span>
      );
      break;

    default:
      badgeContent = <span>{status}</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge variant={variant} className={className}>
        {badgeContent}
      </Badge>

      {/* Secondary badge when medicine is Low Stock and also Near Expiry */}
      {status === "LOW_STOCK" && hasNearExpiry && (
        <Badge variant="nearExpiry" className="text-[10px] py-0 px-1.5 font-normal">
          <Clock className="h-2.5 w-2.5 mr-1" />
          Expiring Soon
        </Badge>
      )}
    </div>
  );
}
