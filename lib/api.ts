// API service for Populate-Tester
// Centralized location for all API calls

const API_BASE_URL = 'http://localhost:5001';
// const API_BASE_URL = 'https://perspectiveshealth.ddns.net';

export interface Conversation {
  id: string;
  timestamp: string;
  workflow_id: string;
  workflow_name: string;
  s3_link: string;
  extracted_info: string;
  center_name: string;
  mapping_screenshot_s3_link?: string;
}

export interface PromptResponse {
  default_prompt: string;
  data: string;
  mapping: Record<string, any>;
  transcript: string;
}

export interface TestPromptRequest {
  conversation_id: string;
  workflow_id: string;
  prompt: string;
  screenshot_s3_link?: string;
}

export interface TestPromptResponse {
  result: Record<string, any>;
  screenshot_url?: string;
}

export interface TranscribeResponse {
  success: boolean;
  recovery_id: string;
  transcript: string;
  message: string;
}

export interface UserSession {
  patient_name: string;
  session_type: string;
  status: string;
  session_id: string;
  workflow_id: string | null;
  created_at: string | null;
  patient_id: string;
}

export interface UserSessionsResponse {
  sessions: UserSession[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all conversations
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/internal/conversations');
  }

  // Get the current prompt with real transcript and mapping
  async getPrompt(conversationId: string, workflowId: string): Promise<PromptResponse> {
    const params = new URLSearchParams({
      conversation_id: conversationId,
      workflow_id: workflowId,
    });
    return this.request<PromptResponse>(`/internal/prompt?${params}`);
  }

  // Transcribe audio file
  async transcribeAudio(file: File): Promise<TranscribeResponse> {
    const formData = new FormData();
    formData.append('wav_file', file);

    const url = `${this.baseUrl}/internal/recover-transcript`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Transcribe request failed:', error);
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId: string): Promise<UserSessionsResponse> {
    return this.request<UserSessionsResponse>('/internal/get_user_sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

export const apiService = new ApiService(); 

// Start a test prompt job
export async function startTestPromptJob(payload: {
  conversation_id: string;
  workflow_id: string;
  prompt: string;
  screenshot_s3_link?: string;
}): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE_URL}/internal/test-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to start test prompt job');
  return res.json();
}

// Poll for job result
export async function getTestPromptResult(job_id: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/internal/test-prompt-result/${job_id}`);
  if (!res.ok) throw new Error('Failed to get test prompt result');
  return res.json();
}

// Clear all test prompt results
export async function clearTestPromptResults(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/internal/test-prompt-clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear test prompt results');
} 