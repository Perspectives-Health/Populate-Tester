"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Play, Zap, Save } from "lucide-react"
import type { Conversation } from "@/lib/api"

interface PromptTesterProps {
  onTest: (prompt: string, conversationIds: string[]) => Promise<void>
  selectedConversation: Conversation | null
  isLoading: boolean
}

const defaultPrompts = [
  {
    name: "Standard Form Filler",
    prompt:
      "Listen to this audio recording and extract information to fill out a form. For each form field, provide the most appropriate answer based on what you hear. If information is not available, respond with 'N/A'.",
  },
  {
    name: "Detailed Extraction",
    prompt:
      "Analyze this audio recording carefully and extract all relevant information. Pay attention to names, contact details, preferences, and any specific requests mentioned. Format your response to match the form fields exactly.",
  },
  {
    name: "Context-Aware Filler",
    prompt:
      "Listen to this conversation and understand the context before filling out the form. Consider the tone, urgency, and specific needs mentioned. Provide accurate and contextually appropriate responses for each field.",
  },
]

export function PromptTester({ onTest, selectedConversation, isLoading }: PromptTesterProps) {
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [savedPrompts, setSavedPrompts] = useState(defaultPrompts)

  const handleTest = async () => {
    if (!currentPrompt.trim() || !selectedConversation) return

    await onTest(currentPrompt, [selectedConversation.id])
  }

  const handleSavePrompt = () => {
    if (!currentPrompt.trim()) return

    const name = prompt("Enter a name for this prompt:")
    if (name) {
      setSavedPrompts((prev) => [...prev, { name, prompt: currentPrompt }])
    }
  }

  return (
    <div className="flex flex-col h-1/2 p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Prompt Tester
          </CardTitle>
          {selectedConversation && (
            <Badge variant="outline" className="w-fit">
              Testing: {selectedConversation.id}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Saved Prompts</label>
            <div className="grid gap-1 max-h-24 overflow-y-auto">
              {savedPrompts.map((saved, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-auto p-2 text-left"
                  onClick={() => setCurrentPrompt(saved.prompt)}
                >
                  <div className="truncate">
                    <div className="font-medium text-xs">{saved.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{saved.prompt.substring(0, 50)}...</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex-1 flex flex-col gap-2">
            <label className="text-sm font-medium">Current Prompt</label>
            <Textarea
              placeholder="Enter your prompt here..."
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="flex-1 min-h-[120px] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={!currentPrompt.trim() || !selectedConversation || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Prompt
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleSavePrompt} disabled={!currentPrompt.trim()}>
              <Save className="h-4 w-4" />
            </Button>
          </div>

          {!selectedConversation && (
            <p className="text-sm text-muted-foreground text-center">Select a conversation to test prompts</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
