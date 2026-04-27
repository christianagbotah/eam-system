"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// useIsMobile hook – defaults to false on SSR to avoid hydration mismatches.
// Uses matchMedia for proper React 18+ behavior.
// ---------------------------------------------------------------------------
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);

    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

// Export the hook so other components can use it too
export { useIsMobile };

// ---------------------------------------------------------------------------
// ResponsiveDialogProps
// ---------------------------------------------------------------------------
export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Max width for desktop mode. Default: "sm:max-w-lg" */
  desktopMaxWidth?: string;
  /** For large forms. Uses "sm:max-w-2xl" as default desktop max-width. */
  large?: boolean;
  /** For extra-large forms like convert-to-WO. Uses "sm:max-w-4xl" as default desktop max-width. */
  extraLarge?: boolean;
  /** Show close button on mobile bottom sheet header. Default: true */
  showCloseButton?: boolean;
}

// ---------------------------------------------------------------------------
// ResponsiveDialog – Bottom Sheet on mobile, centered Dialog on desktop
// ---------------------------------------------------------------------------
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  desktopMaxWidth,
  large = false,
  extraLarge = false,
  showCloseButton = true,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const resolvedMaxWidth = desktopMaxWidth
    ?? (extraLarge ? "sm:max-w-4xl" : large ? "sm:max-w-2xl" : "sm:max-w-lg");

  // ---- Mobile: Bottom Sheet ------------------------------------------------
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className={cn(
            "max-h-[92vh] rounded-t-2xl",
            "flex flex-col overflow-hidden",
            className,
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Drag handle indicator */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

          {/* Header with optional close button */}
          {title && (
            <div className="flex items-center gap-3 px-4 pt-2 pb-1">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base leading-tight">{title}</SheetTitle>
                {description && (
                  <SheetDescription className="text-sm mt-1">{description}</SheetDescription>
                )}
              </div>
              {showCloseButton && (
                <SheetClose asChild>
                  <button
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-muted hover:bg-muted-foreground/10 transition-colors shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </SheetClose>
              )}
            </div>
          )}

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div
              className={cn(
                "border-t bg-background px-4 pt-3",
                "sticky bottom-0 z-10",
              )}
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // ---- Desktop: Centered Dialog --------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(resolvedMaxWidth, "max-h-[85vh] overflow-y-auto", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className={cn(!footer && "pb-2")}>
          {children}
        </div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
