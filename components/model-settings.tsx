"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Eye, EyeOff, Lightbulb, Zap, Sparkles } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"

// 预设模型提供商列表
const MODEL_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    defaultBaseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    defaultBaseURL: "https://api.siliconflow.cn/v1",
    defaultModel: "Qwen/Qwen2.5-7B-Instruct",
  },
  {
    id: "custom",
    name: "自定义提供商",
    defaultBaseURL: "",
    defaultModel: "",
  },
]

export interface ProviderSettings {
  baseURL: string;
  model: string;
  apiKey: string;
}

export interface ModelSettings {
  provider: string;
  temperature: number;
  providerSettings: {
    [key: string]: ProviderSettings;
  };
}

const DEFAULT_SETTINGS: ModelSettings = {
  provider: "openai",
  temperature: 0.7,
  providerSettings: {
    openai: {
      baseURL: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      apiKey: "",
    },
    siliconflow: {
      baseURL: "https://api.siliconflow.cn/v1",
      model: "Qwen/Qwen2.5-7B-Instruct",
      apiKey: "",
    },
    custom: {
      baseURL: "",
      model: "",
      apiKey: "",
    }
  }
}

export default function ModelSettings() {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS)
  const [isOpen, setIsOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const { toast } = useToast()

  // 获取当前提供商的设置
  const currentProviderSettings = settings.providerSettings[settings.provider] || {
    baseURL: "",
    model: "",
    apiKey: ""
  }

  // 在组件挂载时从 localStorage 加载设置
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("model_settings")
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        
        // 如果是旧格式的设置，转换为新格式
        if (!parsedSettings.providerSettings) {
          // 创建新的设置对象
          const convertedSettings: ModelSettings = {
            provider: parsedSettings.provider || DEFAULT_SETTINGS.provider,
            temperature: parsedSettings.temperature !== undefined ? parsedSettings.temperature : DEFAULT_SETTINGS.temperature,
            providerSettings: {...DEFAULT_SETTINGS.providerSettings}
          };
          
          // 将旧的数据迁移到当前提供商
          if (parsedSettings.provider) {
            convertedSettings.providerSettings[parsedSettings.provider] = {
              baseURL: parsedSettings.baseURL || "",
              model: parsedSettings.model || "",
              apiKey: parsedSettings.apiKey || ""
            };
          }
          
          setSettings(convertedSettings);
        } else {
          // 已经是新格式
          setSettings(parsedSettings);
        }
      } else {
        // 如果有旧版的 API 密钥，则迁移它
        const legacyApiKey = localStorage.getItem("openai_api_key")
        if (legacyApiKey) {
          const newSettings = {...DEFAULT_SETTINGS};
          newSettings.providerSettings.openai.apiKey = legacyApiKey;
          setSettings(newSettings);
        } else {
          // 如果没有设置，打开设置对话框
          setIsOpen(true)
        }
      }
    } catch (error) {
      console.error("加载模型设置时出错:", error)
    }
  }, [])

  // 当提供商变更时更新设置
  const handleProviderChange = (providerId: string) => {
    setSettings({
      ...settings,
      provider: providerId
    });
  }

  // 更新当前提供商的设置
  const updateCurrentProviderSettings = (key: keyof ProviderSettings, value: string) => {
    setSettings({
      ...settings,
      providerSettings: {
        ...settings.providerSettings,
        [settings.provider]: {
          ...settings.providerSettings[settings.provider],
          [key]: value
        }
      }
    });
  }

  const handleSave = () => {
    try {
      const { provider, providerSettings, temperature } = settings
      const currentSettings = providerSettings[provider];
      const trimmedKey = currentSettings.apiKey.trim()
      const trimmedBaseURL = currentSettings.baseURL.trim()
      const trimmedModel = currentSettings.model.trim()

      // 简单验证
      if (!trimmedBaseURL) {
        toast({
          title: "基础 URL 不能为空",
          description: "请输入有效的 API 端点 URL",
          variant: "destructive",
        })
        return
      }

      if (!trimmedModel) {
        toast({
          title: "模型名称不能为空",
          description: "请输入有效的模型名称",
          variant: "destructive",
        })
        return
      }

      if (!trimmedKey) {
        toast({
          title: "API 密钥不能为空",
          description: "请输入有效的 API 密钥",
          variant: "destructive",
        })
        return
      }

      // 更新设置
      const updatedSettings = {
        ...settings,
        providerSettings: {
          ...settings.providerSettings,
          [provider]: {
            ...settings.providerSettings[provider],
            baseURL: trimmedBaseURL,
            model: trimmedModel,
            apiKey: trimmedKey
          }
        }
      }

      // 保存到 localStorage
      localStorage.setItem("model_settings", JSON.stringify(updatedSettings))

      // 清除旧版设置
      localStorage.removeItem("openai_api_key")

      // 关闭对话框
      setIsOpen(false)

      // toast({
      //   title: "模型设置已保存",
      //   description: "您的设置已成功保存，将在下次请求中生效",
      // })

      // 不再刷新页面，避免地图和UI重置
      // window.location.reload()
    } catch (error) {
      console.error("保存模型设置时出错:", error)
      toast({
        title: "保存设置时出错",
        description: "请稍后再试",
        variant: "destructive",
      })
    }
  }

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey)
  }

  // 温度模式描述
  const getTemperatureDescription = (temp: number) => {
    if (temp <= 0.3) return "精确模式：提供更一致、更注重事实的回答";
    if (temp <= 0.7) return "平衡模式：在一致性和多样性之间取得良好平衡";
    return "创意模式：提供更多样化和创意性的建议";
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
        <Settings className="h-4 w-4" />
        <span>模型设置</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] z-[100]">
          <DialogHeader>
            <DialogTitle>设置 AI 模型</DialogTitle>
            <DialogDescription>
              配置您要使用的 AI 模型参数。这些设置将安全地存储在您的浏览器中，不会发送到我们的服务器。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {/* 提供商选择 */}
            <div className="grid gap-2">
              <Label htmlFor="provider">
                提供商
              </Label>
              <Select
                value={settings.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模型提供商" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[110]">
                  {MODEL_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 基础 URL */}
            <div className="grid gap-2">
              <Label htmlFor="baseURL">
                API 端点
              </Label>
              <Input
                id="baseURL"
                value={currentProviderSettings.baseURL}
                onChange={(e) => updateCurrentProviderSettings("baseURL", e.target.value)}
                placeholder="https://api.example.com/v1/chat/completions"
              />
            </div>

            {/* 模型名称 */}
            <div className="grid gap-2">
              <Label htmlFor="model">
                模型名称
              </Label>
              <Input
                id="model"
                value={currentProviderSettings.model}
                onChange={(e) => updateCurrentProviderSettings("model", e.target.value)}
                placeholder="gpt-4o"
              />
            </div>

            {/* API 密钥 */}
            <div className="grid gap-2">
              <Label htmlFor="apiKey">
                API 密钥
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  value={currentProviderSettings.apiKey}
                  onChange={(e) => updateCurrentProviderSettings("apiKey", e.target.value)}
                  placeholder="sk-..."
                  type={showApiKey ? "text" : "password"}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={toggleApiKeyVisibility}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">{showApiKey ? "隐藏" : "显示"} API 密钥</span>
                </Button>
              </div>
            </div>

            {/* 温度设置 */}
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="temperature">响应温度</Label>
                <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(1)}</span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[settings.temperature]}
                onValueChange={(values) => setSettings({ ...settings, temperature: values[0] })}
              />
              <div className="text-sm text-muted-foreground mt-1">
                {getTemperatureDescription(settings.temperature)}
              </div>
              
              <TooltipProvider>
                <div className="flex items-center gap-1 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={settings.temperature <= 0.3 ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setSettings({ ...settings, temperature: 0.2 })}
                      >
                        <Zap className={`h-4 w-4 ${settings.temperature <= 0.3 ? "text-primary-foreground" : "text-blue-500"}`} />
                        <span className="ml-1">精确</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>精确模式 (温度: 0.2)</p>
                      <p className="text-xs text-muted-foreground">一致性和事实性更强的回答</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={settings.temperature > 0.3 && settings.temperature <= 0.7 ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setSettings({ ...settings, temperature: 0.6 })}
                      >
                        <Lightbulb className={`h-4 w-4 ${settings.temperature > 0.3 && settings.temperature <= 0.7 ? "text-primary-foreground" : "text-green-500"}`} />
                        <span className="ml-1">平衡</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>平衡模式 (温度: 0.6)</p>
                      <p className="text-xs text-muted-foreground">一致性和多样性的良好平衡</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={settings.temperature > 0.7 ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setSettings({ ...settings, temperature: 0.9 })}
                      >
                        <Sparkles className={`h-4 w-4 ${settings.temperature > 0.7 ? "text-primary-foreground" : "text-purple-500"}`} />
                        <span className="ml-1">创意</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>创意模式 (温度: 0.9)</p>
                      <p className="text-xs text-muted-foreground">更多样化和创意性的建议</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            <div className="col-span-4 text-sm text-muted-foreground">
              {settings.provider === "openai" && (
              <p>
                对于 OpenAI，您可以在{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  OpenAI 平台
                </a>{" "}
                上获取 API 密钥。
              </p>
              )}
              {settings.provider === "siliconflow" && (
                <p className="mt-2">
                  对于 SiliconFlow，您可以在{" "}
                  <a
                    href="https://siliconflow.cn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    SiliconFlow 官网
                  </a>{" "}
                  上注册并获取 API 密钥。
                </p>
              )}
              <p className="mt-2">注意：使用 API 可能会产生费用，具体取决于您选择的服务提供商。</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 