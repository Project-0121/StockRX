import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border",
        available:
          "border-[#1E8E5A]/30 bg-[#E6F4EC] text-[#1E8E5A] font-medium",
        lowStock:
          "border-[#B7791F]/30 bg-[#FDF3DC] text-[#B7791F] font-medium",
        nearExpiry:
          "border-[#C2570C]/30 bg-[#FDECDC] text-[#C2570C] font-medium",
        expired:
          "border-[#B42318]/30 bg-[#FDE7E5] text-[#B42318] font-medium",
        outOfStock:
          "border-[#475467]/30 bg-[#EEF1F5] text-[#475467] font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
