"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Search, Filter, Download } from "lucide-react"
import type { Conversation } from "./conversations-dashboard"
import { conversationsApi, type Conversation, ApiError } from "@/lib/api"

interface ConversationsTableProps {
  onConversationSelect: (conversation: Conversation) => void
  selectedConversation: Conversation | null
}

export function ConversationsTable({ onConversationSelect, selectedConversation }: ConversationsTableProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])

  // Fetch conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await conversationsApi.getAll()
        setConversations(data)
        setFilteredConversations(data)
      } catch (err) {
        const errorMessage = err instanceof ApiError 
          ? `API Error (${err.status}): ${err.message}`
          : err instanceof Error 
            ? err.message 
            : "Failed to fetch conversations"
        setError(errorMessage)
        console.error("Error fetching conversations:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  useEffect(() => {
    const filtered = conversations.filter(
      (conv) =>
        conv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(conv.originalAnswers).toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredConversations(filtered)
  }, [searchTerm, conversations])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="m-4 mb-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Production Conversations</span>
            <Badge variant="secondary">{filteredConversations.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-auto mx-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConversations.map((conversation) => (
              <TableRow
                key={conversation.id}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selectedConversation?.id === conversation.id ? "bg-muted" : ""
                }`}
                onClick={() => onConversationSelect(conversation)}
              >
                <TableCell className="font-mono text-sm">{conversation.id}</TableCell>
                <TableCell className="text-sm">{formatTimestamp(conversation.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatDuration(conversation.metadata.duration)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{conversation.formFields.length} fields</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      conversation.metadata.quality === "high"
                        ? "default"
                        : conversation.metadata.quality === "medium"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {conversation.metadata.quality}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Play audio functionality
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
