import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge variant styles using CVA (Class Variance Authority)
 * Provides consistent styling for badge/pill components
 */
const badgeVariants = cva(
  // Base styles applied to all badges
  [
    "inline-flex",
    "items-center",
    "rounded-full",
    "border",
    "px-2.5",
    "py-0.5",
    "text-xs",
    "font-semibold",
    "transition-colors",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-ring",
    "focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      // Visual style variants for different badge types
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Badge component props interface
 * Extends native HTML div attributes with custom variant prop
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge Component
 * 
 * A small, compact component for displaying labels, tags, or status indicators.
 * Perfect for showing availability, status, or categorization.
 * 
 * @example
 * // Default badge
 * <Badge>New</Badge>
 * 
 * @example
 * // Destructive variant for warnings
 * <Badge variant="destructive">Out of Stock</Badge>
 * 
 * @example
 * // Outline variant for subdued appearance
 * <Badge variant="outline">Tag</Badge>
 */
function Badge({ className, variant = "default", ...props }: BadgeProps) {
  // Extract variant as its proper type to avoid type casting
  const variantValue = variant as Exclude<typeof variant, undefined>

  return (
    <div
      className={cn(badgeVariants({ variant: variantValue }), className)}
      {...props}
    />
  )
}

Badge.displayName = "Badge"

export { Badge, badgeVariants }
