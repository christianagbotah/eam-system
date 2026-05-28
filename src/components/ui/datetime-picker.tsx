'use client'

import * as React from 'react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/components/shared/ResponsiveDialog'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a YYYY-MM-DD string to dd/mm/yyyy display format.
 */
function displayDate(value: string | undefined): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

/**
 * Parse a YYYY-MM-DD string into a Date object at midnight UTC.
 */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return undefined
  return new Date(Number(year), Number(month) - 1, Number(day))
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---------------------------------------------------------------------------
// Shared label wrapper
// ---------------------------------------------------------------------------

function FieldWrapper({
  label,
  children,
  className,
}: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  if (!label) return <>{children}</>
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Time Column (scroll-select)
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const ITEM_HEIGHT = 36

function TimeColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[]
  selected: string
  onSelect: (value: string) => void
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const isInitialScroll = React.useRef(true)

  const scrollToSelected = React.useCallback(() => {
    const container = containerRef.current
    const el = itemRefs.current.get(selected)
    if (!container || !el) return

    const containerHeight = container.clientHeight
    const elTop = el.offsetTop
    const scrollTarget = elTop - containerHeight / 2 + ITEM_HEIGHT / 2

    container.scrollTo({ top: scrollTarget, behavior: isInitialScroll.current ? 'instant' : 'smooth' })
    isInitialScroll.current = false
  }, [selected])

  React.useEffect(() => {
    // Slight delay so DOM is measured after portal render
    const timer = requestAnimationFrame(scrollToSelected)
    return () => cancelAnimationFrame(timer)
  }, [scrollToSelected])

  return (
    <div className="relative h-[3*36px] w-[56px] overflow-hidden rounded-md border bg-background">
      {/* Fade masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-background to-transparent" />

      {/* Center highlight line */}
      <div className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-9 -translate-y-1/2 rounded-md border bg-accent/40" />

      <div
        ref={containerRef}
        className="scrollbar-none h-full snap-y snap-mandatory overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Spacer to center first item */}
        <div style={{ height: ITEM_HEIGHT }} />

        {items.map((item) => (
          <div
            key={item}
            ref={(el) => {
              if (el) itemRefs.current.set(item, el)
            }}
            onClick={() => onSelect(item)}
            className={cn(
              'flex h-9 cursor-pointer snap-center items-center justify-center text-sm transition-colors hover:bg-accent/60',
              item === selected
                ? 'font-bold text-foreground'
                : 'font-normal text-muted-foreground'
            )}
          >
            {item}
          </div>
        ))}

        {/* Spacer to center last item */}
        <div style={{ height: ITEM_HEIGHT }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  /** ISO date string, YYYY-MM-DD, or undefined */
  value?: string
  onChange?: (date: string | undefined) => void
  placeholder?: string
  className?: string
  label?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className,
  label,
}: DatePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const selectedDate = parseDate(value)

  if (isMobile) {
    return (
      <FieldWrapper label={label} className={className}>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="date"
            value={value ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onChange?.(v || undefined)
            }}
            className={cn(
              'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
              'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:bg-input/30 dark:border-input dark:text-foreground'
            )}
          />
        </div>
      </FieldWrapper>
    )
  }

  return (
    <FieldWrapper label={label} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-11 w-full justify-start gap-2 text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <Calendar className="size-4 shrink-0" />
            {value ? displayDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange?.(date ? formatDate(date) : undefined)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}

// ---------------------------------------------------------------------------
// TimePicker
// ---------------------------------------------------------------------------

export interface TimePickerProps {
  /** HH:MM format or undefined */
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'HH:MM',
  className,
  label,
}: TimePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const currentHour = value ? value.split(':')[0] ?? '00' : '00'
  const currentMinute = value ? value.split(':')[1] ?? '00' : '00'

  const handleHourSelect = React.useCallback(
    (h: string) => {
      const m = value?.split(':')[1] ?? '00'
      onChange?.(`${h}:${m}`)
    },
    [value, onChange]
  )

  const handleMinuteSelect = React.useCallback(
    (m: string) => {
      const h = value?.split(':')[0] ?? '00'
      onChange?.(`${h}:${m}`)
    },
    [value, onChange]
  )

  if (isMobile) {
    return (
      <FieldWrapper label={label} className={className}>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="time"
            value={value ?? ''}
            onChange={(e) => {
              onChange?.(e.target.value)
            }}
            className={cn(
              'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
              'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:bg-input/30 dark:border-input dark:text-foreground'
            )}
          />
        </div>
      </FieldWrapper>
    )
  }

  return (
    <FieldWrapper label={label} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-11 w-full justify-start gap-2 text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <Clock className="size-4 shrink-0" />
            {value ?? placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex items-center gap-3">
            <TimeColumn
              items={HOURS}
              selected={currentHour}
              onSelect={handleHourSelect}
            />
            <span className="mt-[-72px] text-lg font-semibold text-muted-foreground">
              :
            </span>
            <TimeColumn
              items={MINUTES}
              selected={currentMinute}
              onSelect={handleMinuteSelect}
            />
          </div>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}

// ---------------------------------------------------------------------------
// DateTimePicker
// ---------------------------------------------------------------------------

export interface DateTimePickerProps {
  /** Full ISO string or YYYY-MM-DDTHH:mm format */
  value?: string
  onChange?: (datetime: string | undefined) => void
  placeholder?: string
  className?: string
  label?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time',
  className,
  label,
}: DateTimePickerProps) {
  const isMobile = useIsMobile()

  // Internal state — split value into date and time parts
  const [dateStr, setDateStr] = React.useState<string>(() => {
    if (!value) return ''
    return value.slice(0, 10) // YYYY-MM-DD
  })

  const [timeStr, setTimeStr] = React.useState<string>(() => {
    if (!value) return ''
    // Handle both "YYYY-MM-DDTHH:mm" and full ISO
    const tIndex = value.indexOf('T')
    if (tIndex >= 0) {
      return value.slice(tIndex + 1, tIndex + 6) // HH:MM
    }
    return ''
  })

  // Sync from external value changes
  React.useEffect(() => {
    if (!value) {
      setDateStr('')
      setTimeStr('')
      return
    }
    setDateStr(value.slice(0, 10))
    const tIndex = value.indexOf('T')
    if (tIndex >= 0) {
      setTimeStr(value.slice(tIndex + 1, tIndex + 6))
    }
  }, [value])

  const emitChange = React.useCallback(
    (d: string, t: string) => {
      if (!d) {
        onChange?.(undefined)
        return
      }
      onChange?.(t ? `${d}T${t}` : `${d}T00:00`)
    },
    [onChange]
  )

  if (isMobile) {
    return (
      <FieldWrapper label={label} className={className}>
        <div className="space-y-2">
          {/* Date native input */}
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const v = e.target.value
                setDateStr(v)
                emitChange(v, timeStr)
              }}
              className={cn(
                'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
                'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
                'placeholder:text-muted-foreground',
                'dark:bg-input/30 dark:border-input dark:text-foreground'
              )}
            />
          </div>
          {/* Time native input */}
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => {
                const v = e.target.value
                setTimeStr(v)
                emitChange(dateStr, v)
              }}
              className={cn(
                'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
                'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
                'placeholder:text-muted-foreground',
                'dark:bg-input/30 dark:border-input dark:text-foreground'
              )}
            />
          </div>
        </div>
      </FieldWrapper>
    )
  }

  // Desktop: two side-by-side buttons
  return (
    <FieldWrapper label={label} className={className}>
      <div className="flex items-center gap-2">
        {/* DatePicker portion */}
        <DatePicker
          value={dateStr || undefined}
          onChange={(d) => {
            setDateStr(d ?? '')
            emitChange(d ?? '', timeStr)
          }}
          placeholder="dd/mm/yyyy"
        />
        {/* TimePicker portion */}
        <TimePicker
          value={timeStr || undefined}
          onChange={(t) => {
            setTimeStr(t)
            emitChange(dateStr, t)
          }}
          placeholder="HH:MM"
        />
      </div>
    </FieldWrapper>
  )
}

// ---------------------------------------------------------------------------
// DateRangePicker
// ---------------------------------------------------------------------------

export interface DateRangePickerProps {
  from?: string
  to?: string
  onChange?: (from: string | undefined, to: string | undefined) => void
  className?: string
  label?: string
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
  label,
}: DateRangePickerProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <FieldWrapper label={label} className={className}>
        <div className="space-y-2">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="date"
              value={from ?? ''}
              onChange={(e) => {
                onChange?.(e.target.value || undefined, to)
              }}
              placeholder="dd/mm/yyyy"
              className={cn(
                'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
                'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
                'placeholder:text-muted-foreground',
                'dark:bg-input/30 dark:border-input dark:text-foreground'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              From
            </span>
          </div>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="date"
              value={to ?? ''}
              onChange={(e) => {
                onChange?.(from, e.target.value || undefined)
              }}
              placeholder="dd/mm/yyyy"
              className={cn(
                'h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm shadow-xs outline-none transition-colors',
                'focus:border-ring focus:ring-ring/50 focus:ring-[3px]',
                'placeholder:text-muted-foreground',
                'dark:bg-input/30 dark:border-input dark:text-foreground'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              To
            </span>
          </div>
        </div>
      </FieldWrapper>
    )
  }

  // Desktop: two DatePickers with arrow
  return (
    <FieldWrapper label={label} className={className}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-11 w-full justify-start gap-2 text-left font-normal',
                  !from && 'text-muted-foreground'
                )}
              >
                <Calendar className="size-4 shrink-0" />
                {from ? displayDate(from) : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={parseDate(from)}
                onSelect={(date) => {
                  onChange?.(date ? formatDate(date) : undefined, to)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-11 w-full justify-start gap-2 text-left font-normal',
                  !to && 'text-muted-foreground'
                )}
              >
                <Calendar className="size-4 shrink-0" />
                {to ? displayDate(to) : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={parseDate(to)}
                onSelect={(date) => {
                  onChange?.(from, date ? formatDate(date) : undefined)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </FieldWrapper>
  )
}
