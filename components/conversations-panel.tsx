"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Conversation } from "./simple-dashboard"

interface ConversationsPanelProps {
  onConversationSelect: (conversation: Conversation) => void
  selectedConversation: Conversation | null
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    timestamp: "2024-01-15T10:30:00Z",
    audioUrl: "/audio/recording_001.mp3",
    originalAnswers: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      message: "I'm interested in your services",
    },
    formFields: [
      { name: "name", type: "text", label: "Full Name", required: true },
      { name: "email", type: "email", label: "Email Address", required: true },
      { name: "phone", type: "tel", label: "Phone Number", required: false },
      { name: "message", type: "textarea", label: "Message", required: true },
    ],
    metadata: { duration: 45, fileSize: 2.1, quality: "high" },
  },
  {
    id: "conv_002",
    timestamp: "2024-01-15T14:22:00Z",
    audioUrl: "/audio/recording_002.mp3",
    originalAnswers: {
      firstName: "Jane",
      lastName: "Smith",
      company: "Tech Corp",
      budget: "$10,000-$50,000",
    },
    formFields: [
      { name: "firstName", type: "text", label: "First Name", required: true },
      { name: "lastName", type: "text", label: "Last Name", required: true },
      { name: "company", type: "text", label: "Company", required: false },
      { name: "budget", type: "select", label: "Budget Range", required: true },
    ],
    metadata: { duration: 67, fileSize: 3.2, quality: "medium" },
  },
  {
    id: "conv_003",
    timestamp: "2024-01-16T09:15:00Z",
    audioUrl: "/audio/recording_003.mp3",
    originalAnswers: {
      customerName: "Alice Johnson",
      issueType: "Technical Support",
      priority: "High",
      description: "Unable to access dashboard after recent update",
    },
    formFields: [
      { name: "customerName", type: "text", label: "Customer Name", required: true },
      { name: "issueType", type: "select", label: "Issue Type", required: true },
      { name: "priority", type: "select", label: "Priority", required: true },
      { name: "description", type: "textarea", label: "Description", required: true },
    ],
    metadata: { duration: 89, fileSize: 4.1, quality: "high" },
  },
  {
    id: "conv_004",
    timestamp: "2024-01-16T15:45:00Z",
    audioUrl: "/audio/recording_004.mp3",
    originalAnswers: {
      name: "Bob Wilson",
      email: "bob@company.com",
      subject: "Partnership Inquiry",
      message: "Looking to discuss potential collaboration opportunities",
    },
    formFields: [
      { name: "name", type: "text", label: "Full Name", required: true },
      { name: "email", type: "email", label: "Email", required: true },
      { name: "subject", type: "text", label: "Subject", required: true },
      { name: "message", type: "textarea", label: "Message", required: true },
    ],
    metadata: { duration: 123, fileSize: 5.8, quality: "high" },
  },
]

export function ConversationsPanel({ onConversationSelect, selectedConversation }: ConversationsPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])

  useEffect(() => {
    setConversations(mockConversations)
    setFilteredConversations(mockConversations)
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString()
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
                selectedConversation?.id === conversation.id ? "bg-muted border-primary" : ""
              }`}
              onClick={() => onConversationSelect(conversation)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{conversation.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Play audio functionality
                      }}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
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
