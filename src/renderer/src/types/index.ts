export interface AiSite {
  id?: number;
  name: string;
  url: string;
  selector: string;
  input_selector: string;
  submit_selector: string;
  enabled: boolean;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface QaRecord {
  id?: number;
  question: string;
  answers: Answer[];
  status: 'pending' | 'completed' | 'failed';
  created_at?: string;
}

export interface Answer {
  site: string;
  answer: string;
  timestamp: string;
  status?: 'success' | 'failed';
  error?: string;
}

export interface ApiConfig {
  id?: number;
  api_key: string;
  port: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  max_tokens?: number;
}