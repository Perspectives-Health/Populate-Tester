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
import { formatDistanceToNow } from "date-fns"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

type SortField = 'center_name' | 'workflow_name' | 'timestamp' | 'duration'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'timestamp', direction: 'desc' })
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({})
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
  const getFieldValue = useCallback((conversation: Conversation, field: SortField) => {
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

  // Memoized sorted conversations to prevent unnecessary re-sorting
  const sortedConversations = useMemo(() => {
    return conversations.sort((a, b) => {
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
  }, [conversations, sortConfig, getFieldValue])

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
        if (!audioDurations[conversation.id]) {
          await getAudioDuration(conversation)
        }
      }
    }

    if (paginatedConversations.length > 0) {
      loadVisibleDurations()
    }
  }, [paginatedConversations, audioDurations])

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
    if (audioDurations[conversation.id]) {
      return audioDurations[conversation.id]
    }

    if (!conversation.s3_link) {
      return null
    }

    try {
      const audio = new Audio(conversation.s3_link)
      
      return new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration
          setAudioDurations(prev => ({ ...prev, [conversation.id]: duration }))
          resolve(duration)
        })
        
        audio.addEventListener('error', () => {
          resolve(0)
        })
        
        // Set a timeout in case the audio doesn't load
        setTimeout(() => {
          resolve(0)
        }, 5000)
      })
    } catch (error) {
      console.error('Error loading audio duration:', error)
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
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading conversations...</div>
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
            <Button onClick={loadConversations} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
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
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:bg-slate-800/50"
                      onClick={() => handleSort('center_name')}
                    >
                      <div className="flex items-center gap-1">
                        Center Name
                        {getSortIcon('center_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[120px] cursor-pointer hover:bg-slate-800/50"
                      onClick={() => handleSort('workflow_name')}
                    >
                      <div className="flex items-center gap-1">
                        Workflow Name
                        {getSortIcon('workflow_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:bg-slate-800/50"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center gap-1">
                        Timestamp
                        {getSortIcon('timestamp')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[80px] cursor-pointer hover:bg-slate-800/50"
                      onClick={() => handleSort('duration')}
                    >
                      <div className="flex items-center gap-1">
                        Duration
                        {getSortIcon('duration')}
                      </div>
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
                        <div className="text-sm text-muted-foreground">
                          {formatDuration(audioDurations[conversation.id] || conversation.metadata?.duration)}
                        </div>
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
