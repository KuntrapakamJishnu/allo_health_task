import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Alert Component
 * 
 * Container for displaying messages, warnings, or notifications to users.
 * Usually contains an icon, title, and description.
 * 
 * CSS Selectors Explanation:
 * - [&>svg~*]: Apply styles to elements that come after an SVG sibling
 * - [&>svg+div]: Apply styles to div immediately after an SVG
 * - [&>svg]: Style the SVG icon itself
 * 
 * @example
 * <Alert>
 *   <AlertCircle className="h-4 w-4" />
 *   <AlertTitle>Warning</AlertTitle>
 *   <AlertDescription>This is a warning message</AlertDescription>
 * </Alert>
 */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "relative",
        "w-full",
        "rounded-lg",
        "border",
        "border-slate-200",
        "p-4",
        // Styles for elements after SVG icon: add left padding to make room for icon
        "[&>svg~*]:pl-7",
        // Styles for divs immediately after SVG: adjust vertical centering
        "[&>svg+div]:translate-y-[-3px]",
        // SVG icon positioning: absolute positioning in top-left with offset
        "[&>svg]:absolute",
        "[&>svg]:left-4",
        "[&>svg]:top-4",
        "[&>svg]:text-slate-950",
        // Dark mode styles
        "dark:border-slate-800",
        "dark:[&>svg]:text-slate-50",
      ].join(" "),
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

/**
 * AlertTitle Component
 * 
 * Bold heading for the alert. Renders as an h5 element.
 * Typically used for brief alert labels (e.g., "Warning", "Error", "Success")
 */
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      [
        "mb-1",
        "font-medium",
        "leading-none",
        "tracking-tight",
      ].join(" "),
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

/**
 * AlertDescription Component
 * 
 * Description or detailed text for the alert.
 * Provides additional context or information to the user.
 */
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "text-sm",
        // Ensure all nested paragraphs have proper line height
        "[&_p]:leading-relaxed",
      ].join(" "),
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
