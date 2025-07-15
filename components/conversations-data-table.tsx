"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiService, Conversation, setApiBaseUrl } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ConversationsDataTable({ onSelect }: { onSelect: (conversation: Conversation | null) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [env, setEnv] = useState<"production" | "testing">(
    process.env.NODE_ENV === "development" ? "testing" : "production"
  )
  // Add a type for the audio dialog state that includes s3_link and extracted_info as optional fields
  const [audioDialog, setAudioDialog] = useState<{ open: boolean; conversation: (Conversation & { s3_link?: string; extracted_info?: string }) | null }>({ open: false, conversation: null });

  // URLs from env
  const prodUrl = process.env.NEXT_PUBLIC_PROD_API_BASE_URL || "http://localhost:5001"
  const testUrl = process.env.NEXT_PUBLIC_TEST_API_BASE_URL || "http://localhost:5001"

  useEffect(() => {
    setApiBaseUrl(env === "production" ? prodUrl : testUrl)
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env])

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getConversations()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations.filter((conversation) =>
    conversation.workflow_id.toLowerCase().includes(searchTerm.toLowerCase())  )

  // Sort conversations by timestamp in descending order (latest first)
  const sortedConversations = filteredConversations.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateB - dateA // Descending order (latest first)
  })

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Unknown"
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "No data"
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const handleSelect = (conversation: Conversation) => {
    if (selectedId === conversation.id) {
      setSelectedId(null)
      onSelect(null)
    } else {
      setSelectedId(conversation.id)
      onSelect(conversation)
    }
  }

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
          <CardTitle className="heading-2-neon">Conversations ({conversations.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={env} onValueChange={(val) => setEnv(val as "production" | "testing")}> 
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadConversations} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
        {/**
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        */}
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
            {searchTerm ? "No conversations match your search." : "No conversations found."}
          </div>
        ) : (
          <div className="h-full overflow-auto custom-scrollbar">
            <div className="rounded-md border min-w-[800px] inline-block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Center Name</TableHead>
                    <TableHead className="min-w-[150px]">Workflow Name</TableHead>
                    <TableHead className="min-w-[120px]">Timestamp</TableHead>
                    <TableHead className="min-w-[100px]">Audio Details</TableHead>
                    <TableHead className="min-w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedConversations.map((conversation) => (
                    <TableRow
                      key={conversation.id}
                      className={selectedId === conversation.id ? "bg-emerald-950/30" : ""}
                    >
                      <TableCell className="min-w-[120px]">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {conversation.center_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {conversation.workflow_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(conversation.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Button size="sm" variant="outline" onClick={() => handleAudioDetails(conversation)}>
                          Audio Details
                        </Button>
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        <Button
                          size="sm"
                          variant={selectedId === conversation.id ? "default" : "outline"}
                          onClick={() => handleSelect(conversation)}
                        >
                          {selectedId === conversation.id ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
