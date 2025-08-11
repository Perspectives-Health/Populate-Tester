"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Database, RefreshCw, Shield, CheckCircle, XCircle } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SyncOption {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  params: Record<string, string | boolean | number>
  warning?: string
}

const syncOptions: SyncOption[] = [
  {
    id: "full",
    label: "Full Database Sync",
    description: "Sync entire database with production",
    icon: <Database className="h-4 w-4" />,
    params: { full: true, incremental: false },
    warning: "This will sync the entire database and may take several minutes."
  },
  {
    id: "recent-7",
    label: "Recent 7 Days",
    description: "Sync data from the last 7 days",
    icon: <RefreshCw className="h-4 w-4" />,
    params: { incremental: true, days: 7 },
    warning: "This will sync data from the last 7 days."
  },
  {
    id: "recent-30",
    label: "Recent 30 Days", 
    description: "Sync data from the last 30 days",
    icon: <RefreshCw className="h-4 w-4" />,
    params: { incremental: true, days: 30 },
    warning: "This will sync data from the last 30 days."
  }
]

export function SyncDbButton() {
  const [selectedOption, setSelectedOption] = useState<SyncOption | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    if (!selectedOption) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(selectedOption.params).forEach(([key, value]) => {
        params.append(key, String(value))
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_API_BASE_URL || 'http://localhost:5001'}/internal/sync-db?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      // Show success message
      toast({
        title: "Database Sync Successful",
        description: `${selectedOption.label} completed successfully.`,
      })
    } catch (error) {
      console.error('Database sync failed:', error)
      toast({
        title: "Database Sync Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during sync.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDialogOpen(false)
      setSelectedOption(null)
    }
  }

  const handleOptionSelect = (option: SyncOption) => {
    setSelectedOption(option)
    setIsDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            Sync Database
          </Button> */}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {syncOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleOptionSelect(option)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="mt-0.5 text-muted-foreground">
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Database Sync
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to proceed with this database sync operation?
            </DialogDescription>
          </DialogHeader>
          
          {selectedOption && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="mt-0.5 text-muted-foreground">
                  {selectedOption.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{selectedOption.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedOption.description}
                  </div>
                  {selectedOption.warning && (
                    <div className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {selectedOption.warning}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setSelectedOption(null)
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Proceed with Sync
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 