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

// Electron API 接口定义
export interface ElectronAPI {
  test: () => string;
  getAiSites: () => Promise<AiSite[]>;
  saveAiSite: (site: AiSite) => Promise<void>;
  deleteAiSite: (siteId: number) => Promise<void>;
  processQuestion: (question: string) => Promise<{answers: Answer[]}>;
  getHistory: () => Promise<QaRecord[]>;
  getApiConfig: () => Promise<ApiConfig>;
  saveApiConfig: (config: Partial<ApiConfig>) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __ELECTRON_API_READY__?: boolean;
    __ELECTRON_API_ERROR__?: string;
  }
  
  // 为全局对象添加类型定义
  interface Global {
    electronAPI?: ElectronAPI;
    __ELECTRON_API_READY__?: boolean;
    __ELECTRON_API_ERROR__?: string;
  }
  
  // 确保 globalThis 也有这些属性
  interface GlobalThis {
    electronAPI?: ElectronAPI;
    __ELECTRON_API_READY__?: boolean;
    __ELECTRON_API_ERROR__?: string;
  }
}