"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiService, Conversation, setApiBaseUrl } from "@/lib/api"
import { formatDistanceToNow, format } from "date-fns"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, X } from "lucide-react"
import { ConversationRowSkeleton, TableHeaderSkeleton, PaginationSkeleton, DurationCellSkeleton } from "@/components/ui/loading-skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type SortField = 'center_name' | 'workflow_name' | 'timestamp' | 'duration'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField | null
  direction: SortDirection
}

interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
}

export function ConversationsDataTable({ 
  onSelect, 
  onConversationsLoad 
}: { 
  onSelect: (conversation: Conversation | null) => void
  onConversationsLoad?: (conversations: Conversation[]) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [env, setEnv] = useState<"production" | "testing">("testing")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: 'asc' })
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({})
  const [loadingDurations, setLoadingDurations] = useState<Set<string>>(new Set())
  const [isSorting, setIsSorting] = useState(false)
  const [filters, setFilters] = useState<{
    center: string[]
    workflow: string[]
    dateRange: { start: string; end: string } | null
    duration: { min: number; max: number | null } | null
  }>({
    center: [],
    workflow: [],
    dateRange: null,
    duration: null
  })
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 25, // Show 25 items per page
    totalItems: 0
  })
  
  // Add a type for the audio dialog state that includes s3_link and extracted_info as optional fields
  const [audioDialog, setAudioDialog] = useState<{ open: boolean; conversation: (Conversation & { s3_link?: string; extracted_info?: string }) | null }>({ open: false, conversation: null });

  // URLs from env
  const prodUrl = process.env.NEXT_PUBLIC_PROD_API_BASE_URL || "http://localhost:5001"
  const testUrl = process.env.NEXT_PUBLIC_TEST_API_BASE_URL || "http://localhost:5001"

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      // Load sort configuration
      const savedSortConfig = localStorage.getItem("conversations_sortConfig")
      if (savedSortConfig) {
        try {
          const parsed = JSON.parse(savedSortConfig)
          if (parsed.field && parsed.direction) {
            setSortConfig(parsed)
          }
        } catch (error) {
          console.error('Error parsing saved sort config:', error)
        }
      }
    } catch (error) {
      console.error('Error loading conversations state:', error)
    }
  }, [])

  // Save sort configuration to localStorage
  useEffect(() => {
    localStorage.setItem("conversations_sortConfig", JSON.stringify(sortConfig))
  }, [sortConfig])

  useEffect(() => {
    setApiBaseUrl(env === "production" ? prodUrl : testUrl)
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env])

  // Define getFieldValue before using it in useMemo
  const getFieldValue = useCallback((conversation: Conversation, field: SortField | null) => {
    if (!field) return ''
    
    switch (field) {
      case 'center_name':
        return conversation.center_name
      case 'workflow_name':
        return conversation.workflow_name
      case 'timestamp':
        return conversation.timestamp
      case 'duration':
        return audioDurations[conversation.id] || conversation.metadata?.duration || 0
      default:
        return ''
    }
  }, [audioDurations])

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const centers = [...new Set(conversations.map(conv => conv.center_name).filter(Boolean))]
    const workflows = [...new Set(conversations.map(conv => conv.workflow_name).filter(Boolean))]
    return { centers, workflows }
  }, [conversations])

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      // Filter by center
      if (filters.center.length > 0 && !filters.center.includes(conversation.center_name)) {
        return false
      }
      
      // Filter by workflow
      if (filters.workflow.length > 0 && !filters.workflow.includes(conversation.workflow_name)) {
        return false
      }
      
      // Filter by date range
      if (filters.dateRange) {
        const conversationDate = new Date(conversation.timestamp)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        
        if (conversationDate < startDate || conversationDate > endDate) {
          return false
        }
      }
      
      // Filter by duration
      if (filters.duration) {
        const duration = audioDurations[conversation.id] || conversation.metadata?.duration || 0
        const durationInSeconds = duration
        
        if (filters.duration.min && durationInSeconds < filters.duration.min * 60) {
          return false
        }
        
        if (filters.duration.max && durationInSeconds > filters.duration.max * 60) {
          return false
        }
      }
      
      return true
    })
  }, [conversations, filters, audioDurations])

  // Memoized sorted conversations to prevent unnecessary re-sorting
  const sortedConversations = useMemo(() => {
    if (!sortConfig.field) {
      return filteredConversations // No sorting applied
    }
    
    setIsSorting(true)
    
    const sorted = filteredConversations.sort((a, b) => {
      const aValue = getFieldValue(a, sortConfig.field)
      const bValue = getFieldValue(b, sortConfig.field)
      
      let comparison = 0
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
    
    // Use setTimeout to simulate sorting delay and show loading state
    setTimeout(() => setIsSorting(false), 100)
    
    return sorted
  }, [filteredConversations, sortConfig, getFieldValue])

  // Memoized paginated conversations
  const paginatedConversations = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return sortedConversations.slice(startIndex, endIndex)
  }, [sortedConversations, pagination.currentPage, pagination.pageSize])

  // Update total items when conversations change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: conversations.length
    }))
  }, [conversations.length])

  // Load audio durations only for visible conversations (lazy loading)
  useEffect(() => {
    const loadVisibleDurations = async () => {
      const visibleConversationsWithAudio = paginatedConversations.filter(conv => conv.s3_link)
      
      for (const conversation of visibleConversationsWithAudio) {
        // Only load if not already loaded and not currently loading
        if (!audioDurations[conversation.id] && !loadingDurations.has(conversation.id)) {
          // Use setTimeout to prevent blocking the main thread
          setTimeout(() => {
            getAudioDuration(conversation)
          }, 0)
        }
      }
    }

    if (paginatedConversations.length > 0) {
      loadVisibleDurations()
    }
  }, [paginatedConversations]) // Only depend on paginatedConversations

  // Clear loading states when conversations change
  useEffect(() => {
    const currentConversationIds = new Set(paginatedConversations.map(conv => conv.id))
    setLoadingDurations(prev => {
      const newSet = new Set(prev)
      // Remove loading states for conversations that are no longer visible
      for (const loadingId of newSet) {
        if (!currentConversationIds.has(loadingId)) {
          newSet.delete(loadingId)
        }
      }
      return newSet
    })
  }, [paginatedConversations])

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getConversations()
      setConversations(data)
      onConversationsLoad?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }

  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleFilterChange = useCallback((type: 'center' | 'workflow', value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [type]: checked 
        ? [...prev[type], value]
        : prev[type].filter(item => item !== value)
    }))
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start, end }
    }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  const handleDurationFilterChange = useCallback((min: number | null, max: number | null) => {
    setFilters(prev => ({
      ...prev,
      duration: min || max ? { min: min || 0, max } : null
    }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      center: [],
      workflow: [],
      dateRange: null,
      duration: null
    })
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // Searchable Multi-Select Component
  const SearchableMultiSelect = ({ 
    options, 
    selectedValues, 
    onSelectionChange, 
    placeholder, 
    searchPlaceholder 
  }: {
    options: string[]
    selectedValues: string[]
    onSelectionChange: (values: string[]) => void
    placeholder: string
    searchPlaceholder: string
  }) => {
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(searchValue.toLowerCase())
    )

    const handleSelect = (value: string) => {
      const newSelection = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value]
      onSelectionChange(newSelection)
    }

    const handleRemove = (value: string) => {
      onSelectionChange(selectedValues.filter(v => v !== value))
    }

    return (
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedValues.length === 0 ? (
                placeholder
              ) : selectedValues.length === 1 ? (
                selectedValues[0]
              ) : (
                `${selectedValues.length} selected`
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      onSelect={() => handleSelect(option)}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        checked={selectedValues.includes(option)}
                        className="mr-2"
                      />
                      <span>{option}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Selected values display */}
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((value) => (
              <Badge key={value} variant="secondary" className="text-xs">
                {value}
                <button
                  onClick={() => handleRemove(value)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }

    // Date Range Filter Component
  const DateRangeFilter = () => {
    const [startDate, setStartDate] = useState<Date | undefined>(filters.dateRange?.start ? new Date(filters.dateRange.start) : undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(filters.dateRange?.end ? new Date(filters.dateRange.end) : undefined)

    const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
      if (type === 'start') {
        setStartDate(date)
      } else {
        setEndDate(date)
      }

      // Update filters when both dates are set or when clearing
      if (date || type === 'start' && !date || type === 'end' && !date) {
        const newStart = type === 'start' ? date : startDate
        const newEnd = type === 'end' ? date : endDate
        
        if (newStart || newEnd) {
          handleDateRangeChange(
            newStart?.toISOString().split('T')[0] || '',
            newEnd?.toISOString().split('T')[0] || ''
          )
        } else {
          setFilters(prev => ({ ...prev, dateRange: null }))
        }
      }
    }

    const getDisplayText = () => {
      if (startDate && endDate) {
        return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`
      } else if (startDate) {
        return `From ${format(startDate, "MMM d")}`
      } else if (endDate) {
        return `Until ${format(endDate, "MMM d")}`
      }
      return "Date Range"
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            {getDisplayText()}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateChange('start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                    {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => handleDateChange('end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate(undefined)
                  setEndDate(undefined)
                  setFilters(prev => ({ ...prev, dateRange: null }))
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear dates
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const getSortIcon = useCallback((field: SortField) => {
    if (sortConfig.field !== field) return null
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }, [sortConfig])

  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Unknown"
    }
  }, [])

  const formatDuration = useCallback((duration?: number) => {
    if (!duration) return "N/A"
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60) // Round to remove milliseconds
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const getAudioDuration = async (conversation: Conversation) => {
    // Early return if already loaded
    if (audioDurations[conversation.id]) {
      return audioDurations[conversation.id]
    }

    // Early return if no audio link
    if (!conversation.s3_link) {
      return null
    }

    // Early return if already loading
    if (loadingDurations.has(conversation.id)) {
      return null
    }

    // Mark this duration as loading
    setLoadingDurations(prev => new Set([...prev, conversation.id]))

    try {
      const audio = new Audio(conversation.s3_link)
      
      return new Promise<number>((resolve) => {
        const cleanup = () => {
          audio.removeEventListener('loadedmetadata', onLoaded)
          audio.removeEventListener('error', onError)
        }

        const onLoaded = () => {
          const duration = audio.duration
          setAudioDurations(prev => ({ ...prev, [conversation.id]: duration }))
          setLoadingDurations(prev => {
            const newSet = new Set(prev)
            newSet.delete(conversation.id)
            return newSet
          })
          cleanup()
          resolve(duration)
        }

        const onError = () => {
          setLoadingDurations(prev => {
            const newSet = new Set(prev)
            newSet.delete(conversation.id)
            return newSet
          })
          cleanup()
          resolve(0)
        }

        audio.addEventListener('loadedmetadata', onLoaded)
        audio.addEventListener('error', onError)
        
        // Set a timeout in case the audio doesn't load
        setTimeout(() => {
          setLoadingDurations(prev => {
            const newSet = new Set(prev)
            newSet.delete(conversation.id)
            return newSet
          })
          cleanup()
          resolve(0)
        }, 3000)
      })
    } catch (error) {
      console.error('Error loading audio duration:', error)
      setLoadingDurations(prev => {
        const newSet = new Set(prev)
        newSet.delete(conversation.id)
        return newSet
      })
      return 0
    }
  }

  const truncateText = useCallback((text: string, maxLength: number = 100) => {
    if (!text) return "No data"
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }, [])

  const handleRowClick = useCallback((conversation: Conversation) => {
    if (selectedId === conversation.id) {
      setSelectedId(null)
      onSelect(null)
    } else {
      setSelectedId(conversation.id)
      onSelect(conversation)
    }
  }, [selectedId, onSelect])

  // When opening the dialog, fetch the full details if not present
  const handleAudioDetails = async (conversation: Conversation) => {
    // If s3_link and extracted_info are not present, fetch them from the backend
    if (conversation.s3_link === undefined || conversation.extracted_info === undefined) {
      try {
        // Fetch the full conversation details (assuming an endpoint exists, otherwise use a placeholder)
        // For now, just set the dialog with empty fields
        setAudioDialog({ open: true, conversation: { ...conversation, s3_link: '', extracted_info: '' } });
      } catch {
        setAudioDialog({ open: true, conversation: { ...conversation, s3_link: '', extracted_info: '' } });
      }
    } else {
      setAudioDialog({ open: true, conversation });
    }
  }

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }))
  }, [])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    }))
  }, [])

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize)
  const startItem = (pagination.currentPage - 1) * pagination.pageSize + 1
  const endItem = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-slate-700/50 animate-pulse rounded" />
            <div className="h-8 w-20 bg-slate-700/50 animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="rounded-md border overflow-x-auto custom-scrollbar flex-1">
              <Table>
                <TableHeaderSkeleton />
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <ConversationRowSkeleton key={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationSkeleton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error: {error}</div>
            <Button onClick={loadConversations} className="ml-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-2-neon">
            Conversations ({pagination.totalItems})
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Center Filter */}
            <div className="w-48">
              <SearchableMultiSelect
                options={filterOptions.centers}
                selectedValues={filters.center}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, center: values }))}
                placeholder="Center..."
                searchPlaceholder="Search centers..."
              />
            </div>

            {/* Workflow Filter */}
            <div className="w-48">
              <SearchableMultiSelect
                options={filterOptions.workflows}
                selectedValues={filters.workflow}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, workflow: values }))}
                placeholder="Workflow..."
                searchPlaceholder="Search workflows..."
              />
            </div>

            {/* Date Range Filter */}
            <div className="w-48">
              <DateRangeFilter />
            </div>

            {/* Duration Filter */}
            <div className="w-32">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Duration
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="duration-10min"
                        checked={filters.duration?.min === 10}
                        onCheckedChange={(checked) => handleDurationFilterChange(checked ? 10 : null, filters.duration?.max || null)}
                      />
                      <label htmlFor="duration-10min" className="text-sm cursor-pointer">
                        Over 10 minutes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="duration-20min"
                        checked={filters.duration?.min === 20}
                        onCheckedChange={(checked) => handleDurationFilterChange(checked ? 20 : null, filters.duration?.max || null)}
                      />
                      <label htmlFor="duration-20min" className="text-sm cursor-pointer">
                        Over 20 minutes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="duration-30min"
                        checked={filters.duration?.min === 30}
                        onCheckedChange={(checked) => handleDurationFilterChange(checked ? 30 : null, filters.duration?.max || null)}
                      />
                      <label htmlFor="duration-30min" className="text-sm cursor-pointer">
                        Over 30 minutes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="duration-60min"
                        checked={filters.duration?.min === 60}
                        onCheckedChange={(checked) => handleDurationFilterChange(checked ? 60 : null, filters.duration?.max || null)}
                      />
                      <label htmlFor="duration-60min" className="text-sm cursor-pointer">
                        Over 1 hour
                      </label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters Button */}
            {(filters.center.length > 0 || filters.workflow.length > 0 || filters.dateRange || filters.duration) && (
              <Button onClick={clearFilters} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            <Button onClick={loadConversations} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
        {/* Filter Summary */}
        {(filters.center.length > 0 || filters.workflow.length > 0 || filters.dateRange || filters.duration) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.center.map(center => (
              <Badge key={`center-${center}`} variant="secondary" className="text-xs">
                Center: {center}
                <button
                  onClick={() => handleFilterChange('center', center, false)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.workflow.map(workflow => (
              <Badge key={`workflow-${workflow}`} variant="secondary" className="text-xs">
                Workflow: {workflow}
                <button
                  onClick={() => handleFilterChange('workflow', workflow, false)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.dateRange && (
              <Badge variant="secondary" className="text-xs">
                Date Range: {new Date(filters.dateRange.start).toLocaleDateString()} - {new Date(filters.dateRange.end).toLocaleDateString()}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: null }))}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.duration && (
              <Badge variant="secondary" className="text-xs">
                Duration: {filters.duration.min}+ min
                <button
                  onClick={() => handleDurationFilterChange(null, null)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Dialog open={audioDialog.open} onOpenChange={open => setAudioDialog({ open, conversation: open ? audioDialog.conversation : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Audio Details</DialogTitle>
            </DialogHeader>
            {audioDialog.conversation && (
              <div>
                <div className="mb-4">
                  <strong>Workflow:</strong> {audioDialog.conversation.workflow_name}
                </div>
                {audioDialog.conversation?.s3_link ? (
                  <audio controls src={audioDialog.conversation.s3_link} className="w-full mb-4" />
                ) : (
                  <div className="mb-4 text-muted-foreground">No audio available.</div>
                )}
                <div>
                  <strong>Transcript:</strong>
                  <div className="bg-slate-900 p-2 rounded mt-2 max-h-64 overflow-auto custom-scrollbar text-xs whitespace-pre-wrap">
                    {audioDialog.conversation?.extracted_info || "No transcript available."}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {sortedConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No conversations found.
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="rounded-md border overflow-x-auto custom-scrollbar flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">
                      Center Name
                    </TableHead>
                    <TableHead className="min-w-[120px]">
                      Workflow Name
                    </TableHead>
                    <TableHead className="min-w-[100px]">
                      Timestamp
                    </TableHead>
                    <TableHead className="min-w-[80px]">
                      Duration
                    </TableHead>
                    <TableHead className="min-w-[80px]">Audio Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConversations.map((conversation) => (
                    <TableRow
                      key={conversation.id}
                      className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${
                        selectedId === conversation.id ? "bg-emerald-950/30" : ""
                      }`}
                      onClick={() => handleRowClick(conversation)}
                    >
                      <TableCell className="min-w-[100px]">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {conversation.center_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {conversation.workflow_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(conversation.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        {loadingDurations.has(conversation.id) ? (
                          <DurationCellSkeleton />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {formatDuration(audioDurations[conversation.id] || conversation.metadata?.duration)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAudioDetails(conversation)
                          }}
                        >
                          Audio Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startItem}-{endItem} of {pagination.totalItems} conversations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 4, pagination.currentPage - 2)) + i
                      if (page > totalPages) return null
                      return (
                        <Button
                          key={page}
                          variant={page === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page size:</span>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
