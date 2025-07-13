"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Eye, ArrowUpDown } from "lucide-react"
import { ConversationDetailsModal } from "./conversation-details-modal"
import type { Conversation } from "./resizable-dashboard"

interface ConversationsDataTableProps {
  onSelectionChange: (conversations: Conversation[]) => void
  selectedConversations: Conversation[]
}

// Enhanced mock data
const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    name: "John Doe",
    workflow: "Lead Qualification",
    email: "john@example.com",
    timestamp: "2024-01-15T10:30:00Z",
    audioUrl: "/audio/recording_001.mp3",
    originalAnswers: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      message: "I'm interested in your services",
      company: "Tech Solutions",
    },
    formFields: [
      { name: "name", type: "text", label: "Full Name", required: true },
      { name: "email", type: "email", label: "Email Address", required: true },
      { name: "phone", type: "tel", label: "Phone Number", required: false },
      { name: "message", type: "textarea", label: "Message", required: true },
    ],
    metadata: { duration: 45, fileSize: 2.1, quality: "high", tags: ["sales", "inquiry"] },
  },
  {
    id: "conv_002",
    name: "Jane Smith",
    workflow: "Enterprise Sales",
    email: "jane@techcorp.com",
    timestamp: "2024-01-15T14:22:00Z",
    audioUrl: "/audio/recording_002.mp3",
    originalAnswers: {
      firstName: "Jane",
      lastName: "Smith",
      company: "Tech Corp",
      budget: "$10,000-$50,000",
      timeline: "Q2 2024",
    },
    formFields: [
      { name: "firstName", type: "text", label: "First Name", required: true },
      { name: "lastName", type: "text", label: "Last Name", required: true },
      { name: "company", type: "text", label: "Company", required: false },
      { name: "budget", type: "select", label: "Budget Range", required: true },
    ],
    metadata: { duration: 67, fileSize: 3.2, quality: "medium", tags: ["lead", "enterprise"] },
  },
  {
    id: "conv_003",
    name: "Alice Johnson",
    workflow: "Customer Support",
    email: "alice@company.com",
    timestamp: "2024-01-16T09:15:00Z",
    audioUrl: "/audio/recording_003.mp3",
    originalAnswers: {
      customerName: "Alice Johnson",
      issueType: "Technical Support",
      priority: "High",
      description: "Unable to access dashboard after recent update",
      affectedSystems: ["Dashboard", "Reports"],
    },
    formFields: [
      { name: "customerName", type: "text", label: "Customer Name", required: true },
      { name: "issueType", type: "select", label: "Issue Type", required: true },
      { name: "priority", type: "select", label: "Priority", required: true },
      { name: "description", type: "textarea", label: "Description", required: true },
    ],
    metadata: { duration: 89, fileSize: 4.1, quality: "high", tags: ["support", "urgent"] },
  },
  {
    id: "conv_004",
    name: "Bob Wilson",
    workflow: "Partnership Intake",
    email: "bob@partner.com",
    timestamp: "2024-01-16T15:45:00Z",
    audioUrl: "/audio/recording_004.mp3",
    originalAnswers: {
      name: "Bob Wilson",
      email: "bob@partner.com",
      subject: "Partnership Opportunity",
      message: "Looking to discuss potential collaboration opportunities",
      partnershipType: "Technology Integration",
    },
    formFields: [
      { name: "name", type: "text", label: "Full Name", required: true },
      { name: "email", type: "email", label: "Email", required: true },
      { name: "subject", type: "text", label: "Subject", required: true },
      { name: "message", type: "textarea", label: "Message", required: true },
    ],
    metadata: { duration: 123, fileSize: 5.8, quality: "high", tags: ["partnership", "business"] },
  },
  {
    id: "conv_005",
    name: "Sarah Chen",
    workflow: "Product Demo",
    email: "sarah@startup.io",
    timestamp: "2024-01-17T11:20:00Z",
    audioUrl: "/audio/recording_005.mp3",
    originalAnswers: {
      name: "Sarah Chen",
      email: "sarah@startup.io",
      phone: "+1555123456",
      message: "Interested in enterprise pricing",
      company: "StartupCo",
    },
    formFields: [
      { name: "name", type: "text", label: "Full Name", required: true },
      { name: "email", type: "email", label: "Email Address", required: true },
      { name: "phone", type: "tel", label: "Phone Number", required: false },
      { name: "message", type: "textarea", label: "Message", required: true },
    ],
    metadata: { duration: 56, fileSize: 2.8, quality: "medium", tags: ["sales", "enterprise"] },
  },
]

export function ConversationsDataTable({ onSelectionChange, selectedConversations }: ConversationsDataTableProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [nameFilter, setNameFilter] = useState("")
  const [emailFilter, setEmailFilter] = useState("")
  const [workflowFilter, setWorkflowFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<keyof Conversation>("timestamp")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedConversationForModal, setSelectedConversationForModal] = useState<Conversation | null>(null)

  useEffect(() => {
    setConversations(mockConversations)
  }, [])

  const workflows = useMemo(() => {
    const workflowList = [...new Set(conversations.map((c) => c.workflow))]
    return workflowList
  }, [conversations])

  const filteredAndSortedConversations = useMemo(() => {
    const filtered = conversations.filter((conv) => {
      const matchesSearch =
        conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.workflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesName = nameFilter === "" || conv.name.toLowerCase().includes(nameFilter.toLowerCase())
      const matchesEmail = emailFilter === "" || conv.email.toLowerCase().includes(emailFilter.toLowerCase())
      const matchesWorkflow = workflowFilter === "all" || conv.workflow === workflowFilter

      return matchesSearch && matchesName && matchesEmail && matchesWorkflow
    })

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [conversations, searchTerm, nameFilter, emailFilter, workflowFilter, sortField, sortDirection])

  const handleSort = (field: keyof Conversation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedConversations)
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

  const handleViewDetails = (conversation: Conversation) => {
    setSelectedConversationForModal(conversation)
    setIsModalOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setNameFilter("")
    setEmailFilter("")
    setWorkflowFilter("all")
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const isSelected = (conversation: Conversation) => {
    return selectedConversations.some((c) => c.id === conversation.id)
  }

  const allSelected =
    filteredAndSortedConversations.length > 0 && filteredAndSortedConversations.every((conv) => isSelected(conv))

  return (
    <div className="h-full flex flex-col">
      <Card className="m-4 mb-2 neon-accent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="neon-text">Conversations</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="neon-border">
                {selectedConversations.length} selected
              </Badge>
              <Badge variant="outline">{filteredAndSortedConversations.length} total</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Global search (name, email, workflow, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 neon-border"
            />
          </div>

          {/* Specific Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Input
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-40 neon-border"
              />
            </div>

            <div className="relative">
              <Input
                placeholder="Filter by email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="w-40 neon-border"
              />
            </div>

            <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
              <SelectTrigger className="w-48 neon-border">
                <SelectValue placeholder="Filter by workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow} value={workflow}>
                    {workflow}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={clearFilters} className="neon-border bg-transparent">
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden mx-4">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} className="neon-border" />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("id")} className="h-auto p-0 font-medium">
                    ID <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("name")}
                    className="h-auto p-0 font-medium"
                  >
                    Name <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("workflow")}
                    className="h-auto p-0 font-medium"
                  >
                    Workflow <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("email")}
                    className="h-auto p-0 font-medium"
                  >
                    Email <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("timestamp")}
                    className="h-auto p-0 font-medium"
                  >
                    Date <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedConversations.map((conversation) => (
                <TableRow
                  key={conversation.id}
                  className={`border-slate-800 hover:bg-slate-900/50 ${
                    isSelected(conversation) ? "bg-emerald-950/30 neon-glow" : ""
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected(conversation)}
                      onCheckedChange={(checked) => handleSelectConversation(conversation, checked as boolean)}
                      className="neon-border"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-300">{conversation.id}</TableCell>
                  <TableCell className="font-medium text-emerald-400">{conversation.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                      {conversation.workflow}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{conversation.email}</TableCell>
                  <TableCell className="text-slate-400">{formatDate(conversation.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-purple-400">
                      {formatDuration(conversation.metadata.duration)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 hover:text-cyan-300"
                      onClick={() => handleViewDetails(conversation)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Conversation Details Modal */}
      <ConversationDetailsModal
        conversation={selectedConversationForModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
