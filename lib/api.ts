// API service for Populate-Tester
// Centralized location for all API calls

// Read environment variables for API base URLs
const PROD_API_BASE_URL = process.env.NEXT_PUBLIC_PROD_API_BASE_URL || 'http://localhost:5001';
const TEST_API_BASE_URL = process.env.NEXT_PUBLIC_TEST_API_BASE_URL || 'http://localhost:5001';

// Default to production, but allow toggling for ALL APIs
let currentApiBaseUrl = PROD_API_BASE_URL;

export function setApiBaseUrl(url: string) {
  currentApiBaseUrl = url;
}

export interface Conversation {
  id: string;
  timestamp: string;
  workflow_id: string;
  workflow_name: string;
  s3_link: string;
  extracted_info: string;
  center_name: string;
  mapping_screenshot_s3_link?: string;
  // Optional properties for UI compatibility
  name?: string;
  email?: string;
  metadata?: { duration?: number; quality?: string };
  workflow?: string;
  formFields?: any[];
  originalAnswers?: Record<string, any>;
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
  include_screenshot?: boolean;
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
  // Use the dynamic currentApiBaseUrl for ALL APIs
  private get baseUrl() {
    return currentApiBaseUrl;
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

// Use the dynamic currentApiBaseUrl for test prompt jobs
export async function startTestPromptJob(payload: {
  conversation_id: string;
  workflow_id: string;
  prompt: string;
  screenshot_s3_link?: string;
  include_screenshot?: boolean;
}): Promise<{ job_id: string }> {
  const url = `${currentApiBaseUrl}/internal/test-prompt`;
  console.log('API: Sending test prompt request to backend:', payload)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('API: Test prompt request failed:', res.status, errorText)
    throw new Error(`Failed to start test prompt job: ${res.status} ${errorText}`);
  }
  
  const result = await res.json()
  console.log('API: Test prompt request successful:', result)
  return result;
}

// Poll for job result
export async function getTestPromptResult(job_id: string): Promise<any> {
  const url = `${currentApiBaseUrl}/internal/test-prompt-result/${job_id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text()
    console.error('API: Test prompt result request failed:', res.status, errorText)
    throw new Error(`Failed to get test prompt result: ${res.status} ${errorText}`);
  }
  return res.json();
}

// Clear all test prompt results
export async function clearTestPromptResults(): Promise<void> {
  const url = `${currentApiBaseUrl}/internal/test-prompt-clear`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear test prompt results');
} 