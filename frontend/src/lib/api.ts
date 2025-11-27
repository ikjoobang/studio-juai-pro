/**
 * API Client for Super Agent Platform Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
export interface ChatRequest {
  user_id: string;
  message: string;
  context?: Record<string, any>;
  session_id?: string;
}

export interface ChatResponse {
  message: string;
  action_cards?: ActionCard[];
  suggestions?: string[];
  session_id: string;
}

export interface ActionCard {
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  actions: { label: string; action: string }[];
}

export interface ProjectCreateRequest {
  user_id: string;
  title: string;
  industry?: string;
  target_channel?: string[];
  aspect_ratio?: string;
  client_requirements?: string;
  reference_urls?: string[];
  style_preset?: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: string;
  industry?: string;
  target_channel: string[];
  aspect_ratio: string;
  created_at: string;
}

export interface VideoRequest {
  project_id: string;
  concept: string;
  target_channels?: string[];
  style?: string;
  aspect_ratio?: string;
  duration?: number;
  reference_urls?: string[];
}

export interface Asset {
  id: string;
  project_id: string;
  type: "image" | "video" | "audio";
  url: string;
  prompt_used?: string;
  status: string;
}

export interface Trend {
  id: number;
  title: string;
  platform: string;
  growth: string;
  category: string;
  keywords: string[];
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Health Check
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>("/api/health");
  }

  // ========== Chat API ==========

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getProactivePrompt(
    userBehavior: Record<string, any>
  ): Promise<{ prompt: string }> {
    return this.request<{ prompt: string }>("/api/chat/proactive", {
      method: "POST",
      body: JSON.stringify(userBehavior),
    });
  }

  // ========== Projects API ==========

  async createProject(request: ProjectCreateRequest): Promise<Project> {
    return this.request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${projectId}`);
  }

  async getUserProjects(userId: string): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>(
      `/api/projects/user/${userId}`
    );
  }

  // ========== Factory API ==========

  async startProduction(request: VideoRequest): Promise<{
    status: string;
    project_id: string;
    message: string;
    estimated_time: string;
  }> {
    return this.request("/api/factory/start", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getProductionStatus(projectId: string): Promise<{
    project_id: string;
    status: string;
    assets: Asset[];
    asset_count: number;
  }> {
    return this.request(`/api/factory/status/${projectId}`);
  }

  // ========== Trends API ==========

  async getTrends(
    category: string = "all",
    limit: number = 10
  ): Promise<{ trends: Trend[] }> {
    return this.request<{ trends: Trend[] }>(
      `/api/trends?category=${category}&limit=${limit}`
    );
  }

  // ========== Vendors API ==========

  async getVendors(): Promise<{
    vendors: Array<{
      id: string;
      service_name: string;
      status: string;
    }>;
  }> {
    return this.request("/api/vendors");
  }

  // ========== Action Cards API ==========

  async executeActionCard(
    cardType: string,
    action: string,
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    result: any;
  }> {
    return this.request("/api/action-cards/execute", {
      method: "POST",
      body: JSON.stringify({ card_type: cardType, action, data }),
    });
  }

  // ========== Prompts API ==========

  async generatePrompt(
    concept: string,
    style: string = "iphone_korean",
    aspectRatio: string = "9:16"
  ): Promise<{
    prompt: string;
    style: string;
    aspect_ratio: string;
    keywords: string[];
  }> {
    return this.request("/api/prompts/generate", {
      method: "POST",
      body: JSON.stringify({
        concept,
        style,
        aspect_ratio: aspectRatio,
      }),
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for custom instances
export { ApiClient };
