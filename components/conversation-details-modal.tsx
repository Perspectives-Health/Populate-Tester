"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Volume2, FileText, User, Mail, Calendar, Clock } from "lucide-react"
import type { Conversation } from "./resizable-dashboard"

interface ConversationDetailsModalProps {
  conversation: Conversation | null
  isOpen: boolean
  onClose: () => void
}

// Mock transcript data
const mockTranscript = `[00:00] Speaker 1: Hi, thank you for calling Tech Solutions. My name is Sarah, how can I help you today?

[00:03] Speaker 2: Hi Sarah, my name is John Doe. I'm calling because I'm interested in learning more about your enterprise solutions and pricing tiers.

[00:12] Speaker 1: That's great John! I'd be happy to help you with that. Can I get your email address so I can send you some information?

[00:18] Speaker 2: Sure, it's john@example.com. That's J-O-H-N at example dot com.

[00:25] Speaker 1: Perfect, I've got that down. And what's the best phone number to reach you at?

[00:30] Speaker 2: You can reach me at 1-234-567-8900. That's my direct line.

[00:36] Speaker 1: Excellent. Now, can you tell me a bit about your company and what specific solutions you're looking for?

[00:42] Speaker 2: We're Tech Solutions Inc, and we're looking for a comprehensive platform that can handle our customer management and analytics needs. We're particularly interested in the enterprise tier because we have about 500 employees.

[00:55] Speaker 1: That sounds like a perfect fit for our Enterprise package. I'll make sure to include detailed information about our enterprise features in the materials I send you. Is there anything specific you'd like me to focus on?

[01:05] Speaker 2: Yes, I'm particularly interested in the pricing structure and implementation timeline. We're looking to make a decision by Q2 2024.

[01:13] Speaker 1: Absolutely, I'll include our enterprise pricing guide and typical implementation schedules. You should receive everything within the next hour. Is there anything else I can help you with today?

[01:22] Speaker 2: No, that covers everything. Thank you so much for your help, Sarah.

[01:25] Speaker 1: You're very welcome, John! Have a great day and don't hesitate to reach out if you have any questions.

[01:30] Speaker 2: Thank you, you too. Goodbye!

[01:32] Speaker 1: Goodbye!`

export function ConversationDetailsModal({ conversation, isOpen, onClose }: ConversationDetailsModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

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
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {mockTranscript.split("\n\n").map((segment, index) => {
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
