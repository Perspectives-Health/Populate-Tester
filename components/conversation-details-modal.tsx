"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, User, Mail, Calendar, Clock, Play, Pause, Volume2 } from "lucide-react"
import { conversationsApi, type Conversation, type ConversationDetails, ApiError } from "@/lib/api"

interface ConversationDetailsModalProps {
  conversation: Conversation | null
  isOpen: boolean
  onClose: () => void
}

export function ConversationDetailsModal({ conversation, isOpen, onClose }: ConversationDetailsModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch conversation details when modal opens
  useEffect(() => {
    if (isOpen && conversation) {
      const fetchConversationDetails = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const data = await conversationsApi.getById(conversation.id)
          setConversationDetails(data)
        } catch (err) {
          const errorMessage = err instanceof ApiError 
            ? `API Error (${err.status}): ${err.message}`
            : err instanceof Error 
              ? err.message 
              : "Failed to fetch conversation details"
          setError(errorMessage)
          console.error("Error fetching conversation details:", err)
        } finally {
          setIsLoading(false)
        }
      }

      fetchConversationDetails()
    }
  }, [isOpen, conversation])

  if (!conversation) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const renderJSONWithSyntaxHighlighting = (jsonString: string) => {
    return jsonString.split("\n").map((line, index) => {
      let highlightedLine = line

      // Highlight keys
      highlightedLine = highlightedLine.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')

      // Highlight string values
      highlightedLine = highlightedLine.replace(/: "([^"]*)"([,}]?)/g, ': <span class="json-string">"$1"</span>$2')

      // Highlight numbers
      highlightedLine = highlightedLine.replace(/: (\d+)([,}]?)/g, ': <span class="json-number">$1</span>$2')

      // Highlight booleans
      highlightedLine = highlightedLine.replace(/: (true|false)([,}]?)/g, ': <span class="json-boolean">$1</span>$2')

      // Highlight null
      highlightedLine = highlightedLine.replace(/: (null)([,}]?)/g, ': <span class="json-null">$1</span>$2')

      return (
        <div key={index} className="font-mono text-sm">
          <span dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      )
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <FileText className="h-5 w-5" />
            Conversation Details - {conversation.id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[80vh]">
          {/* Conversation Info */}
          <Card className="mb-4 neon-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-emerald-400">Conversation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Name</p>
                    <p className="text-sm font-medium text-slate-200">{conversation.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-200">{conversation.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Date</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(conversation.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="text-sm font-medium text-slate-200">
                      {formatDuration(conversation.metadata.duration)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                  {conversation.workflow}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          <Card className="mb-4 neon-accent">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)} className="neon-border">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1 bg-slate-800 rounded-full h-2 relative">
                  <div
                    className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTime / conversation.metadata.duration) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-400 font-mono">
                  {formatDuration(currentTime)} / {formatDuration(conversation.metadata.duration)}
                </span>
                <Volume2 className="h-4 w-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Transcript and Original Answers */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="transcript" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="answers">Original Answers</TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="flex-1 overflow-hidden mt-4">
                <Card className="h-full neon-accent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-emerald-400">Conversation Transcript</CardTitle>
                  </CardHeader>
                  <CardContent className="h-full overflow-hidden">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                          <p className="text-slate-400">Loading transcript...</p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-red-400 mb-2">Error: {error}</p>
                          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : conversationDetails?.transcript ? (
                      <ScrollArea className="h-full">
                        <div className="space-y-3">
                          {conversationDetails.transcript.split("\n\n").map((segment, index) => {
                            const [timestamp, ...textParts] = segment.split("] ")
                            const speaker = textParts[0]?.split(": ")[0]
                            const text = textParts[0]?.split(": ").slice(1).join(": ")

                            return (
                              <div key={index} className="flex gap-3">
                                <div className="flex-shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {timestamp?.replace("[", "")}
                                  </Badge>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <span className="font-medium text-emerald-400">{speaker}:</span>{" "}
                                    <span className="text-slate-300">{text}</span>
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400">No transcript available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="answers" className="flex-1 overflow-hidden mt-4">
                <Card className="h-full neon-accent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-emerald-400">Original Form Answers</CardTitle>
                  </CardHeader>
                  <CardContent className="h-full overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        {renderJSONWithSyntaxHighlighting(formatJSON(conversation.originalAnswers))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
