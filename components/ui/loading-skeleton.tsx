import { cn } from "@/lib/utils"
import {
  TableRow,
  TableCell,
  TableHeader,
  TableHead,
} from "@/components/ui/table"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-700/50", className)}
      {...props}
    />
  )
}

// Conversation row skeleton
export function ConversationRowSkeleton() {
  return (
    <TableRow className="hover:bg-slate-800/50">
      <TableCell className="py-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-12" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </TableCell>
    </TableRow>
  )
}

// Duration cell skeleton
export function DurationCellSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-4 w-12" />
    </div>
  )
}

// Filter panel skeleton
export function FilterPanelSkeleton() {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-900/50">
      <div>
        <Skeleton className="h-4 w-16 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Table header skeleton
export function TableHeaderSkeleton() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="min-w-[120px]">
          <Skeleton className="h-4 w-20" />
        </TableHead>
        <TableHead className="min-w-[100px]">
          <Skeleton className="h-4 w-16" />
        </TableHead>
        <TableHead className="min-w-[120px]">
          <Skeleton className="h-4 w-18" />
        </TableHead>
        <TableHead className="min-w-[100px]">
          <Skeleton className="h-4 w-14" />
        </TableHead>
        <TableHead className="min-w-[80px]">
          <Skeleton className="h-4 w-12" />
        </TableHead>
        <TableHead className="min-w-[80px]">
          <Skeleton className="h-4 w-16" />
        </TableHead>
        <TableHead className="min-w-[120px]">
          <Skeleton className="h-4 w-20" />
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

// Pagination skeleton
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  )
}

// Environment toggle skeleton
export function EnvironmentToggleSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-12 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

// Button skeleton
export function ButtonSkeleton() {
  return <Skeleton className="h-10 w-24 rounded" />
}

// Badge skeleton
export function BadgeSkeleton() {
  return <Skeleton className="h-6 w-16 rounded-full" />
}

// Job card skeleton
export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 border-l-4 border-l-blue-500">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Prompt tester skeleton
export function PromptTesterSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          <label className="heading-3-neon mb-1">Prompt Instructions</label>
          <div className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 pb-8 flex flex-col gap-2">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-12 rounded" />
          <Skeleton className="h-12 w-20 rounded" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton } 