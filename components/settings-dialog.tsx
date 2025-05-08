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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Settings } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsDialog() {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [temperature, setTemperature] = useState(0.7)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [provider, setProvider] = useState("openai")

  // Load settings from localStorage when dialog opens
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedProvider = localStorage.getItem("provider") || "openai"
        const savedBaseUrl = localStorage.getItem(`baseUrl_${savedProvider}`) || ""
        const savedApiKey = localStorage.getItem(`apiKey_${savedProvider}`) || ""
        const savedModel = localStorage.getItem("model") || ""
        const savedTemperature = parseFloat(localStorage.getItem("temperature") || "0.7")
        
        setProvider(savedProvider)
        setBaseUrl(savedBaseUrl)
        setApiKey(savedApiKey)
        setModel(savedModel)
        setTemperature(savedTemperature)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    if (open) {
      loadSettings()
    }
  }, [open])

  const handleSave = async () => {
    try {
      // Save settings to localStorage
      localStorage.setItem("provider", provider)
      localStorage.setItem(`baseUrl_${provider}`, baseUrl)
      localStorage.setItem(`apiKey_${provider}`, apiKey)
      localStorage.setItem("model", model)
      localStorage.setItem("temperature", temperature.toString())
      
      toast({
        title: "设置已保存",
        description: "您的AI模型设置已更新。",
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: "错误",
        description: "保存设置失败。请重试。",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">设置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI模型设置</DialogTitle>
          <DialogDescription>配置用于地图查询的AI模型和响应质量。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">模型配置</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                提供商
              </Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value)
                  // Set default base URLs based on provider
                  if (e.target.value === "openai") {
                    setBaseUrl("https://api.openai.com/v1")
                  } else if (e.target.value === "anthropic") {
                    setBaseUrl("https://api.anthropic.com")
                  } else if (e.target.value === "custom") {
                    setBaseUrl("")
                  }
                  
                  // Load saved API key for the selected provider
                  const savedApiKey = localStorage.getItem(`apiKey_${e.target.value}`) || ""
                  setApiKey(savedApiKey)
                }}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseUrl" className="text-right">
                基础URL
              </Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API密钥
              </Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                placeholder="您的API密钥"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                模型
              </Label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">默认 (gpt-4o)</option>
                {provider === "openai" && (
                  <>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </>
                )}
                {provider === "anthropic" && (
                  <>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">响应质量</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">温度: {temperature.toFixed(1)}</Label>
                <span className="text-xs text-muted-foreground">
                  {temperature < 0.4 ? "专注" : temperature > 0.7 ? "创意" : "平衡"}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                较低的值产生更一致的结果，较高的值产生更多样化的结果。
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
