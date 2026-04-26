'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from './ResponsiveDialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          isMobile && 'fixed inset-x-4 bottom-4 top-auto translate-x-0 translate-y-0 rounded-2xl max-w-none',
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(isMobile && 'text-base')}>{title}</AlertDialogTitle>
          <AlertDialogDescription className={cn(isMobile && 'text-sm')}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn(isMobile && 'flex-col-reverse gap-2 sm:flex-row')}>
          <AlertDialogCancel disabled={loading} className={cn(isMobile && 'h-11')}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white',
              isMobile && 'h-11',
            )}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
