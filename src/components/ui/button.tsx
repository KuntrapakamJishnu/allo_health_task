import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button variant styles using CVA (Class Variance Authority)
 * Provides consistent styling across different button types and sizes
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "whitespace-nowrap",
    "rounded-md",
    "text-sm",
    "font-medium",
    "ring-offset-background",
    "transition-colors",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ring",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      // Visual style variants
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // Size variants
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button component props interface
 * Extends native HTML button attributes with custom variant and size props
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** If true, uses Slot to merge with child element instead of rendering a button */
  asChild?: boolean
}

/**
 * Button Component
 * 
 * A flexible, accessible button component with multiple style variants and sizes.
 * 
 * @example
 * // Default button
 * <Button>Click me</Button>
 * 
 * @example
 * // Destructive variant with large size
 * <Button variant="destructive" size="lg">Delete</Button>
 * 
 * @example
 * // Icon button
 * <Button variant="ghost" size="icon"><Icon /></Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    // Extract variant and size as their proper types to avoid type casting
    const variantValue = variant as Exclude<typeof variant, undefined>
    const sizeValue = size as Exclude<typeof size, undefined>

    return (
      <Comp
        className={cn(buttonVariants({ variant: variantValue, size: sizeValue }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
