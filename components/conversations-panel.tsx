"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, Search, Filter, X } from "lucide-react"
import { conversationsApi, type Conversation, ApiError } from "@/lib/api"

interface ConversationsPanelProps {
  onSelectionChange: (conversations: Conversation[]) => void
  selectedConversations: Conversation[]
}

export function ConversationsPanel({ onSelectionChange, selectedConversations }: ConversationsPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [workflowFilter, setWorkflowFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Filter conversations based on search and workflow
  useEffect(() => {
    const filtered = conversations.filter((conv) => {
      const matchesSearch =
        conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.workflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesWorkflow = workflowFilter === "all" || conv.workflow === workflowFilter

      return matchesSearch && matchesWorkflow
    })

    setFilteredConversations(filtered)
  }, [conversations, searchTerm, workflowFilter])

  const workflows = [...new Set(conversations.map((c) => c.workflow))]

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredConversations)
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectConversation = (conversation: Conversation, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedConversations, conversation])
    } else {
      onSelectionChange(selectedConversations.filter((c) => c.id !== conversation.id))
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setWorkflowFilter("all")
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const isSelected = (conversation: Conversation) => {
    return selectedConversations.some((c) => c.id === conversation.id)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-3">Conversations</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredConversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                isSelected(conversation) ? "bg-muted border-primary" : ""
              }`}
              onClick={() => handleSelectConversation(conversation, !isSelected(conversation))}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{conversation.id}</span>
                    <Checkbox
                      checked={isSelected(conversation)}
                      onCheckedChange={(checked) => handleSelectConversation(conversation, checked)}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">{formatDate(conversation.timestamp)}</div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(conversation.metadata.duration)}
                    </Badge>
                    <Badge
                      variant={conversation.metadata.quality === "high" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {conversation.metadata.quality}
                    </Badge>
                  </div>

                  <div className="text-xs">
                    <span className="text-muted-foreground">{conversation.formFields.length} fields:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(conversation.originalAnswers)
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      {Object.keys(conversation.originalAnswers).length > 2 && (
                        <div className="text-muted-foreground">
                          +{Object.keys(conversation.originalAnswers).length - 2} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
