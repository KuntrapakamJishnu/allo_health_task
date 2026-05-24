import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card Component
 * 
 * Container component for grouping related content with border and shadow.
 * Use with CardHeader, CardTitle, CardDescription, CardContent, and CardFooter
 * for consistent card layouts.
 * 
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Settings</CardTitle>
 *     <CardDescription>Manage your preferences</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </Card>
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "rounded-lg",
        "border",
        "border-slate-200",
        "bg-white",
        "text-slate-950",
        "shadow-sm",
        "dark:border-slate-800",
        "dark:bg-slate-950",
        "dark:text-slate-50",
      ].join(" "),
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

/**
 * CardHeader Component
 * 
 * Header section of a card, typically containing title and description.
 * Provides spacing and vertical layout structure.
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "flex",
        "flex-col",
        "space-y-1.5",
        "p-6",
      ].join(" "),
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

/**
 * CardTitle Component
 * 
 * Main heading for card content. Rendered as an h2 element.
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      [
        "text-2xl",
        "font-semibold",
        "leading-none",
        "tracking-tight",
      ].join(" "),
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/**
 * CardDescription Component
 * 
 * Secondary text for card headers. Provides additional context or subtitle.
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      [
        "text-sm",
        "text-slate-500",
        "dark:text-slate-400",
      ].join(" "),
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/**
 * CardContent Component
 * 
 * Main content area of the card. Provides padding and spacing.
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "p-6",
        "pt-0",
      ].join(" "),
      className
    )}
    {...props}
  />
))
CardContent.displayName = "CardContent"

/**
 * CardFooter Component
 * 
 * Footer section of the card, typically for actions or additional information.
 * Displays children in a horizontal flex layout.
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      [
        "flex",
        "items-center",
        "p-6",
        "pt-0",
      ].join(" "),
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
