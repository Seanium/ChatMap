"use client"

import type React from "react"

import { useState, useEffect, useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useMapStore, TASK_TYPES } from "@/lib/store"
import { generateMapResponseClient, generateStreamingResponseClient } from "@/lib/client-api"
import { Loader2, Send, X } from "lucide-react"
import SuggestedQueries from "@/components/suggested-queries"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// 动态导入 react-markdown 以减少初始包体积
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })

// 消息类型定义
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isLoading?: boolean;
  error?: boolean;
}

interface Location {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
}

export default function ChatInterface() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const { setMarkers, setTaskType } = useMapStore()
  const { toast } = useToast()
  const [hasModelSettings, setHasModelSettings] = useState(false)
  const [isExtractingInfo, setIsExtractingInfo] = useState(false) // 提取信息状态
  const [isUpdatingMap, setIsUpdatingMap] = useState(false) // 更新地图状态
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 添加AbortController引用
  const abortControllerRef = useRef<AbortController | null>(null)

  // 检查模型设置
  useEffect(() => {
    try {
      // 检查是否有模型设置
      const settingsStr = localStorage.getItem("model_settings")
      if (settingsStr) {
        setHasModelSettings(true)
      } else {
        // 检查旧版 API 密钥
        const legacyApiKey = localStorage.getItem("openai_api_key")
        setHasModelSettings(!!legacyApiKey)
      }
    } catch (error) {
      console.error("检查模型设置时出错:", error)
    }
  }, [])

  // 滚动到最新消息
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 调整文本域高度的函数
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    // 更新查询
    setQuery(target.value);
    
    // 如果内容为空，直接重置高度
    if (!target.value.trim()) {
      target.style.height = '38px';
      return;
    }
    
    // 重置高度，让scrollHeight计算正确
    target.style.height = 'auto';
    // 设置新高度，即使在内容减少时也能正确调整
    const newHeight = Math.min(Math.max(target.scrollHeight, 38), 150);
    target.style.height = `${newHeight}px`;
  };

  // 重置文本框高度的函数
  const resetTextareaHeight = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = '38px';
    }
  };

  // 提交查询并开始流式响应
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证查询
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    // 重置文本框高度
    resetTextareaHeight();

    // 检查是否设置了模型
    if (!hasModelSettings) {
      toast({
        title: "缺少模型设置",
        description: "请先配置您的 AI 模型设置",
        variant: "destructive",
      })
      return
    }

    // 添加用户消息
    const userMessageId = generateId()
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: trimmedQuery,
    }
    
    // 创建助手的初始加载消息
    const assistantMessageId = generateId()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isLoading: true,
    }
    
    // 添加消息到对话中
    setMessages(prev => [...prev, userMessage, assistantMessage])
    
    // 清空输入
    setQuery("")
    
    // 滚动到底部
    setTimeout(scrollToBottom, 100)
    
    // 开始生成回复
    handleGenerateResponse(trimmedQuery, userMessageId, assistantMessageId);
  }

  const handleClearConversation = () => {
    // 如果正在生成回复，先停止所有进行中的操作
    if (isStreaming || isExtractingInfo || isUpdatingMap) {
      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      setIsStreaming(false)
      setIsExtractingInfo(false)
      setIsUpdatingMap(false)
      
      // 添加一条消息提示用户响应已被中断
      // toast({
      //   title: "已中断",
      //   description: "响应生成已被取消",
      // })
    }
    
    // 清空消息和地图标记
    setMessages([])
    setMarkers([])
    setTaskType(TASK_TYPES.LOCATION_LIST) // 重置任务类型
  }

  // 处理生成回复的逻辑（从handleSubmit中提取出来的核心部分）
  const handleGenerateResponse = async (queryText: string, userMessageId: string, assistantMessageId: string) => {
    try {
      // 创建新的AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort() // 取消之前的请求（如果有）
      }
      abortControllerRef.current = new AbortController()
      
      setIsStreaming(true)
      
      // 准备对话历史
      const conversationHistory = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // 添加当前用户消息
      conversationHistory.push({
        role: "user",
        content: queryText
      });
      
      // 开始流式响应，传入AbortSignal
      const stream = await generateStreamingResponseClient(
        conversationHistory, 
        abortControllerRef.current.signal
      )
      
      if (!stream) {
        throw new Error("无法创建流式响应")
      }
      
      let fullResponse = ""
      
      // 处理流式响应
      for await (const chunk of stream) {
        // 如果请求已被取消，停止处理
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        if (chunk) {
          fullResponse += chunk
          
          // 更新助手消息的内容
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: fullResponse, isLoading: false } 
                : msg
            )
          )
        }
      }
      
      // 如果请求已被取消，不再继续后续处理
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      // 流式响应完成后，等待一小段时间确保前端更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 添加一条流式回答已完成的调试日志
      console.log(`[聊天界面] 流式回答已完成，内容: "${fullResponse.substring(0, 100)}${fullResponse.length > 100 ? '...' : ''}"`);

      // 开始提取信息
      setIsExtractingInfo(true);
      try {
        // 如果请求已被取消，不再继续处理
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        // 更新对话历史，确保包含最新的助手回答，这对后续提取很重要
        const updatedConversationHistory = [
          ...conversationHistory,
          { role: "assistant", content: fullResponse }
        ];
        
        // 调用常规API获取结构化数据
        console.log(`[聊天界面] 开始从回答中提取信息`);
        const response = await generateMapResponseClient(queryText, updatedConversationHistory);
        
        // 如果请求已被取消，不再继续处理
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        console.log(`[聊天界面] 提取信息完成，任务类型: ${response.task_type}, 地点数量: ${response.locations?.length || 0}`);

        // 设置任务类型
        setTaskType(response.task_type);
        
        // 根据任务类型决定是否更新地图
        if (response.task_type !== TASK_TYPES.NO_MAP_UPDATE) {
          setIsExtractingInfo(false);
          setIsUpdatingMap(true);
          
          // 如果请求已被取消，不再继续处理
          if (abortControllerRef.current?.signal.aborted) {
            return;
          }
          
          if (response.locations?.length > 0) {
            // 设置标记
            setMarkers(Array.isArray(response.locations) ? response.locations : []);
            console.log(`[地图数据] 任务类型: ${response.task_type}, 地点数量: ${response.locations.length}`);
          } else {
            console.log(`[地图数据] 未提取到地点信息`);
            setMarkers([]);
          }
        } else {
          console.log(`[聊天界面] 无需更新地图的任务: ${response.task_type}`);
          // 清除可能存在的地图数据
          setMarkers([]);
        }
      } catch (mapError) {
        // 如果请求已被取消，不再记录错误
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        console.error("提取信息出错:", mapError);
        // 不中断流程，因为文本回复已经生成
      } finally {
        // 仅在未被取消的情况下重置状态
        if (!abortControllerRef.current?.signal.aborted) {
          setIsExtractingInfo(false);
          setIsUpdatingMap(false);
        }
      }
      
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if (error instanceof Error && (error.message === "用户取消了请求" || error.name === "AbortError")) {
        console.log("用户取消了请求");
        return;
      }
      
      console.error("Error in handleGenerateResponse:", error)
      
      // 更新助手消息为错误状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: `生成响应时出错: ${error instanceof Error ? error.message : "未知错误"}。请稍后再试或尝试不同的查询。`, 
                isLoading: false,
                error: true 
              } 
            : msg
        )
      )

      // 显示提示通知
      toast({
        title: "错误",
        description: "生成响应时出错。请稍后再试。",
        variant: "destructive",
      })

      // 清除地图
      setMarkers([])
    } finally {
      // 清除AbortController
      abortControllerRef.current = null;
      
      // 重置状态
      setIsStreaming(false)
      setIsExtractingInfo(false)
      setIsUpdatingMap(false)
    }
  }

  const handleSuggestedQuery = (suggestedQuery: string) => {
    try {
      if (!suggestedQuery || typeof suggestedQuery !== "string") {
        console.error("Invalid suggested query:", suggestedQuery)
        return
      }

      // 设置查询内容（用于显示在输入框中）
      setQuery(suggestedQuery)
      
      // 重置文本框高度
      resetTextareaHeight();
      
      // 使用预设的查询内容直接提交，而不是依赖表单
      if (!isStreaming && !isExtractingInfo && !isUpdatingMap) {
        // 添加用户消息
        const userMessageId = generateId()
        const userMessage: Message = {
          id: userMessageId,
          role: "user",
          content: suggestedQuery,
        }
        
        // 创建助手的初始加载消息
        const assistantMessageId = generateId()
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          isLoading: true,
        }
        
        // 添加消息到对话中
        setMessages(prev => [...prev, userMessage, assistantMessage])
        
        // 清空输入
        setQuery("")
        
        // 滚动到底部
        setTimeout(scrollToBottom, 100)
        
        // 开始生成回复
        handleGenerateResponse(suggestedQuery, userMessageId, assistantMessageId);
      }
    } catch (error) {
      console.error("Error in handleSuggestedQuery:", error)
      toast({
        title: "错误",
        description: "处理建议的查询时出错。",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果按下Enter键且没有按住Shift键，则提交表单
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = document.getElementById("chat-form") as HTMLFormElement;
      if (form && !isStreaming && !isExtractingInfo && !isUpdatingMap) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="w-full md:w-[450px] border-l flex flex-col h-full">
      <Tabs defaultValue="answer" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
          <TabsTrigger value="answer">对话</TabsTrigger>
          <TabsTrigger value="sources">数据来源</TabsTrigger>
        </TabsList>

        <TabsContent value="answer" className="flex-1 flex flex-col overflow-hidden relative">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClearConversation} 
              disabled={messages.length === 0}
              className="absolute top-2 left-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-sm"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">清除对话</span>
            </Button>
          )}
          
          {messages.length > 0 ? (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div 
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%] leading-relaxed",
                        message.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted",
                        message.error && "bg-destructive text-destructive-foreground"
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center h-6">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>思考中...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden leading-relaxed">
                          <ReactMarkdown>
                            {message.content.replace(/^\n+/, '')}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <Avatar>
                        <AvatarFallback className="bg-secondary">YOU</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
                
                {isExtractingInfo && (
                  <div className="flex justify-center my-2">
                    <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      <span>正在提取信息...</span>
                    </div>
                  </div>
                )}
                
                {isUpdatingMap && (
                  <div className="flex justify-center my-2">
                    <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      <span>正在更新地图...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <h2 className="text-2xl font-bold mb-8">我能帮您探索什么？</h2>
              <SuggestedQueries onSelectQuery={handleSuggestedQuery} />
            </div>
          )}

          <form id="chat-form" onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
            <Textarea
              value={query}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyDown}
              placeholder="搜索或询问任何地点..."
              disabled={isStreaming || isExtractingInfo || isUpdatingMap}
              className="flex-1 min-h-[38px] max-h-[150px] resize-none py-2"
              style={{height: '38px'}}
            />
            <Button type="submit" size="icon" disabled={isStreaming || isExtractingInfo || isUpdatingMap}>
              {isStreaming || isExtractingInfo || isUpdatingMap ? 
                <Loader2 className="h-4 w-4 animate-spin" /> : 
                <Send className="h-4 w-4" />
              }
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="sources" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <p>信息来源包括但不限于：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>OpenStreetMap</li>
              <li>AI 语言模型</li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">注意：结果可能并不总是准确或最新的。请始终验证重要信息。</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
