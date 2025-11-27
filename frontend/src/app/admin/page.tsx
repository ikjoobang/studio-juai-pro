"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Server,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Activity,
  Database,
  Brain,
  Video,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// API Base URL - Railway Production (하드코딩)
const API_BASE_URL = "https://studio-juai-pro-production.up.railway.app";

// ============================================
// Types
// ============================================

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  system_instruction: string;
  prompt_template: string;
  default_model: string;
  default_style: string;
  updated_at?: string;
}

interface Vendor {
  id: string;
  name: string;
  api_endpoint: string;
  api_key_env: string;
  model_type: string;
  is_active: boolean;
  models?: string[];
}

interface HealthStatus {
  status: string;
  services: Record<string, string>;
  features: Record<string, boolean>;
}

// ============================================
// Admin Page Component
// ============================================

export default function AdminPage() {
  // State
  const [activeTab, setActiveTab] = useState("templates");
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  // Templates State
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Vendors State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);

  // Trends State
  const [trends, setTrends] = useState<string[]>([]);
  const [newTrend, setNewTrend] = useState("");

  // ============================================
  // API Functions
  // ============================================

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error("Health check failed:", error);
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/templates`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (template: PromptTemplate, isEditing: boolean = false) => {
    try {
      // 기존 템플릿 수정 시 PUT, 새 템플릿 생성 시 POST
      const url = isEditing 
        ? `${API_BASE_URL}/api/admin/templates/${template.id}`
        : `${API_BASE_URL}/api/admin/templates`;
      
      const method = isEditing ? "PUT" : "POST";
      
      console.log(`📝 [Admin] ${isEditing ? "수정" : "생성"} 요청:`, template.id);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Admin] 템플릿 ${isEditing ? "수정" : "생성"} 성공:`, data);
        
        // 리스트 자동 새로고침
        await fetchTemplates();
        setIsTemplateDialogOpen(false);
        setEditingTemplate(null);
        
        alert(`템플릿이 ${isEditing ? "수정" : "생성"}되었습니다.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save template:", errorData);
        alert(`저장 실패: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("이 템플릿을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/templates/${templateId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/vendors`);
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVendor = async (vendor: Vendor) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });

      if (response.ok) {
        await fetchVendors();
        setIsVendorDialogOpen(false);
        setEditingVendor(null);
      }
    } catch (error) {
      console.error("Failed to save vendor:", error);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (!confirm("이 벤더를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/vendors/${vendorId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchVendors();
      }
    } catch (error) {
      console.error("Failed to delete vendor:", error);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/trends`);
      const data = await response.json();
      setTrends(data.trends || []);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    }
  };

  const saveTrends = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trends }),
      });

      if (response.ok) {
        alert("트렌드가 저장되었습니다.");
      }
    } catch (error) {
      console.error("Failed to save trends:", error);
    }
  };

  const addTrend = () => {
    if (newTrend.trim() && !trends.includes(newTrend.trim())) {
      setTrends([...trends, newTrend.trim()]);
      setNewTrend("");
    }
  };

  const removeTrend = (trend: string) => {
    setTrends(trends.filter((t) => t !== trend));
  };

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    fetchHealthStatus();
    fetchTemplates();
    fetchVendors();
    fetchTrends();
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Header */}
      <header className="h-14 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            작업화면
          </Button>
          <h1 className="text-lg font-bold">Admin CMS</h1>
          <Badge variant="outline" className="border-[#03C75A] text-[#03C75A]">
            Studio Juai PRO
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Health Status */}
          {healthStatus && (
            <div className="flex items-center gap-2">
              <Activity
                className={cn(
                  "w-4 h-4",
                  healthStatus.status === "healthy"
                    ? "text-green-500"
                    : "text-red-500"
                )}
              />
              <span className="text-sm text-gray-400">
                {healthStatus.status === "healthy" ? "시스템 정상" : "오류 감지"}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchHealthStatus}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-6">
        {/* System Status Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {healthStatus?.services &&
            Object.entries(healthStatus.services).map(([service, status]) => (
              <Card key={service} className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service === "goapi" && <Video className="w-4 h-4 text-blue-400" />}
                      {service === "gemini" && <Brain className="w-4 h-4 text-purple-400" />}
                      {service === "creatomate" && <Sparkles className="w-4 h-4 text-yellow-400" />}
                      {service === "heygen" && <Video className="w-4 h-4 text-pink-400" />}
                      {service === "supabase" && <Database className="w-4 h-4 text-green-400" />}
                      <span className="text-sm capitalize">{service}</span>
                    </div>
                    {status === "configured" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a1a1a] border border-[#333]">
            <TabsTrigger value="templates" className="data-[state=active]:bg-[#03C75A]">
              <FileText className="w-4 h-4 mr-2" />
              프롬프트 템플릿
            </TabsTrigger>
            <TabsTrigger value="vendors" className="data-[state=active]:bg-[#03C75A]">
              <Server className="w-4 h-4 mr-2" />
              벤더 관리
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-[#03C75A]">
              <TrendingUp className="w-4 h-4 mr-2" />
              트렌드 관리
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>프롬프트 템플릿</CardTitle>
                  <CardDescription>
                    용도별 System Instruction과 프롬프트 템플릿을 관리합니다.
                  </CardDescription>
                </div>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-[#03C75A] hover:bg-[#02a84d]"
                      onClick={() => {
                        setEditingTemplate({
                          id: "",
                          name: "",
                          category: "",
                          system_instruction: "",
                          prompt_template: "",
                          default_model: "kling",
                          default_style: "warm_film",
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      템플릿 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-[#333] max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate?.id ? "템플릿 수정" : "새 템플릿"}
                      </DialogTitle>
                      <DialogDescription>
                        AI Director가 사용할 프롬프트 템플릿을 설정합니다.
                      </DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              템플릿 ID
                            </label>
                            <Input
                              value={editingTemplate.id}
                              onChange={(e) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  id: e.target.value,
                                })
                              }
                              placeholder="shopping_mall"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              템플릿 이름
                            </label>
                            <Input
                              value={editingTemplate.name}
                              onChange={(e) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  name: e.target.value,
                                })
                              }
                              placeholder="쇼핑몰용 프롬프트"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              카테고리
                            </label>
                            <Input
                              value={editingTemplate.category}
                              onChange={(e) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  category: e.target.value,
                                })
                              }
                              placeholder="e-commerce"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              기본 모델
                            </label>
                            <Select
                              value={editingTemplate.default_model}
                              onValueChange={(value) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  default_model: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                                <SelectItem value="kling">Kling</SelectItem>
                                <SelectItem value="veo">Veo</SelectItem>
                                <SelectItem value="sora">Sora</SelectItem>
                                <SelectItem value="heygen">HeyGen</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              기본 스타일
                            </label>
                            <Select
                              value={editingTemplate.default_style}
                              onValueChange={(value) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  default_style: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                                <SelectItem value="warm_film">따뜻한 필름</SelectItem>
                                <SelectItem value="cool_modern">시원한 모던</SelectItem>
                                <SelectItem value="golden_hour">골든아워</SelectItem>
                                <SelectItem value="cinematic_teal_orange">시네마틱</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">
                            System Instruction
                          </label>
                          <Textarea
                            value={editingTemplate.system_instruction}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                system_instruction: e.target.value,
                              })
                            }
                            placeholder="AI가 영상을 생성할 때 따라야 할 지침을 입력하세요..."
                            className="bg-[#0a0a0a] border-[#333] min-h-[100px]"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">
                            프롬프트 템플릿
                          </label>
                          <Textarea
                            value={editingTemplate.prompt_template}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                prompt_template: e.target.value,
                              })
                            }
                            placeholder="{변수}를 사용하여 동적 프롬프트를 작성하세요..."
                            className="bg-[#0a0a0a] border-[#333] min-h-[100px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {"{product_name}"}, {"{scene_description}"} 등의 변수 사용 가능
                          </p>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsTemplateDialogOpen(false)}
                        className="border-[#333]"
                      >
                        취소
                      </Button>
                      <Button
                        className="bg-[#03C75A] hover:bg-[#02a84d]"
                        onClick={() => {
                          if (editingTemplate) {
                            // 기존 템플릿에 updated_at이 있으면 수정 모드
                            const isEditing = Boolean(editingTemplate.updated_at);
                            saveTemplate(editingTemplate, isEditing);
                          }
                        }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-white">{template.name}</h3>
                              <Badge variant="outline" className="border-[#555] text-gray-300">
                                {template.category}
                              </Badge>
                              <Badge className="bg-blue-500/20 text-blue-400">
                                {template.default_model}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">
                              {template.system_instruction.slice(0, 150)}...
                            </p>
                            <code className="text-xs bg-[#1a1a1a] px-2 py-1 rounded text-gray-300">
                              {template.prompt_template.slice(0, 100)}...
                            </code>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingTemplate(template);
                                setIsTemplateDialogOpen(true);
                              }}
                              className="border-[#03C75A] text-[#03C75A] hover:bg-[#03C75A] hover:text-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteTemplate(template.id)}
                              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {templates.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        템플릿이 없습니다. 새 템플릿을 추가해주세요.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>벤더 (API) 관리</CardTitle>
                  <CardDescription>
                    새로운 AI 툴이 나오면 API Endpoint만 입력해서 즉시 연결합니다.
                  </CardDescription>
                </div>
                <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-[#03C75A] hover:bg-[#02a84d]"
                      onClick={() => {
                        setEditingVendor({
                          id: "",
                          name: "",
                          api_endpoint: "",
                          api_key_env: "",
                          model_type: "video_generation",
                          is_active: true,
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      벤더 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-[#333]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingVendor?.id ? "벤더 수정" : "새 벤더"}
                      </DialogTitle>
                      <DialogDescription>
                        새로운 AI API 서비스를 등록합니다.
                      </DialogDescription>
                    </DialogHeader>

                    {editingVendor && (
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              벤더 ID
                            </label>
                            <Input
                              value={editingVendor.id}
                              onChange={(e) =>
                                setEditingVendor({
                                  ...editingVendor,
                                  id: e.target.value,
                                })
                              }
                              placeholder="new_api"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              벤더 이름
                            </label>
                            <Input
                              value={editingVendor.name}
                              onChange={(e) =>
                                setEditingVendor({
                                  ...editingVendor,
                                  name: e.target.value,
                                })
                              }
                              placeholder="New AI Service"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">
                            API Endpoint
                          </label>
                          <Input
                            value={editingVendor.api_endpoint}
                            onChange={(e) =>
                              setEditingVendor({
                                ...editingVendor,
                                api_endpoint: e.target.value,
                              })
                            }
                            placeholder="https://api.example.com/v1"
                            className="bg-[#0a0a0a] border-[#333]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              API Key 환경변수명
                            </label>
                            <Input
                              value={editingVendor.api_key_env}
                              onChange={(e) =>
                                setEditingVendor({
                                  ...editingVendor,
                                  api_key_env: e.target.value,
                                })
                              }
                              placeholder="NEW_API_KEY"
                              className="bg-[#0a0a0a] border-[#333]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">
                              모델 타입
                            </label>
                            <Select
                              value={editingVendor.model_type}
                              onValueChange={(value) =>
                                setEditingVendor({
                                  ...editingVendor,
                                  model_type: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                                <SelectItem value="video_generation">영상 생성</SelectItem>
                                <SelectItem value="image_generation">이미지 생성</SelectItem>
                                <SelectItem value="avatar_generation">아바타 생성</SelectItem>
                                <SelectItem value="video_editing">영상 편집</SelectItem>
                                <SelectItem value="ai_brain">AI 브레인</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsVendorDialogOpen(false)}
                        className="border-[#333]"
                      >
                        취소
                      </Button>
                      <Button
                        className="bg-[#03C75A] hover:bg-[#02a84d]"
                        onClick={() => editingVendor && saveVendor(editingVendor)}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full",
                              vendor.is_active ? "bg-green-500" : "bg-red-500"
                            )}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{vendor.name}</h3>
                              <Badge variant="outline" className="border-[#555] text-gray-300">
                                {vendor.model_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-300">
                              {vendor.api_endpoint}
                            </p>
                            <p className="text-xs text-gray-400">
                              Env: {vendor.api_key_env}
                            </p>
                            {vendor.models && (
                              <div className="flex gap-1 mt-1">
                                {vendor.models.map((model) => (
                                  <Badge
                                    key={model}
                                    className="text-xs bg-blue-500/20 text-blue-400"
                                  >
                                    {model}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Only show delete for custom vendors */}
                        {!["goapi", "kling_official", "heygen", "creatomate", "gemini"].includes(
                          vendor.id
                        ) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteVendor(vendor.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader>
                <CardTitle>트렌드 관리</CardTitle>
                <CardDescription>
                  이번 주 유행어나 트렌드를 입력하면 AI Director가 기획에 반영합니다.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Add Trend Input */}
                  <div className="flex gap-2">
                    <Input
                      value={newTrend}
                      onChange={(e) => setNewTrend(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTrend()}
                      placeholder="새 트렌드 입력 (예: ASMR, 브이로그, 챌린지)"
                      className="bg-[#0a0a0a] border-[#333]"
                    />
                    <Button onClick={addTrend} className="bg-[#03C75A] hover:bg-[#02a84d]">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Trends List */}
                  <div className="flex flex-wrap gap-2">
                    {trends.map((trend) => (
                      <Badge
                        key={trend}
                        variant="outline"
                        className="border-[#03C75A] text-[#03C75A] px-3 py-1 cursor-pointer hover:bg-[#03C75A]/10"
                        onClick={() => removeTrend(trend)}
                      >
                        {trend}
                        <XCircle className="w-3 h-3 ml-2" />
                      </Badge>
                    ))}

                    {trends.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        등록된 트렌드가 없습니다. 위 입력창에서 추가하세요.
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  {trends.length > 0 && (
                    <Button onClick={saveTrends} className="bg-[#03C75A] hover:bg-[#02a84d]">
                      <Save className="w-4 h-4 mr-2" />
                      트렌드 저장
                    </Button>
                  )}

                  {/* Usage Info */}
                  <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
                    <h4 className="font-medium mb-2">💡 트렌드 활용 방법</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• AI Director가 영상 기획 시 트렌드 키워드를 참고합니다.</li>
                      <li>• 프롬프트 자동 최적화에 트렌드가 반영됩니다.</li>
                      <li>• 주기적으로 업데이트하면 최신 트렌드 반영 가능합니다.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
