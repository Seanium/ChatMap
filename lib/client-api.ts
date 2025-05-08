"use client"

// 客户端 API 函数
import { ModelSettings, ProviderSettings } from "@/components/model-settings"

interface Message {
  role: string;
  content: string;
}

export async function generateMapResponseClient(query: string, conversationHistory?: Message[]) {
  if (!query || typeof query !== "string") {
    return {
      text: "查询无效。请提供有效的查询字符串。",
      locations: [],
      error: true,
    }
  }

  try {
    // 从 localStorage 获取模型设置
    const settingsStr = localStorage.getItem("model_settings")
    
    // 如果没有设置，检查旧版 API 密钥或返回错误
    if (!settingsStr) {
      const legacyApiKey = localStorage.getItem("openai_api_key")
      if (!legacyApiKey) {
        return {
          text: "缺少模型设置。请先配置您的 AI 模型。",
          locations: [],
          error: true,
        }
      }
      
      // 使用旧版 API 密钥（兼容性支持）
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": legacyApiKey,
        },
        body: JSON.stringify({ 
          query,
          conversationHistory: conversationHistory || []
        }),
      })
      
      const data = await response.json()
      return {
        text: data.text || "无可用的响应文本",
        task_type: data.task_type || "LOCATION_LIST",
        locations: Array.isArray(data.locations) ? data.locations : [],
        polylines: Array.isArray(data.polylines) ? data.polylines : [],
        error: !!data.error,
      }
    }
    
    // 解析模型设置
    const settings: ModelSettings = JSON.parse(settingsStr)
    const provider = settings.provider
    const providerSettings = settings.providerSettings?.[provider] || {
      baseURL: "",
      model: "",
      apiKey: ""
    }
    
    // 发送请求到 API 路由，包含完整的模型设置和对话历史
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        query,
        conversationHistory: conversationHistory || [],
        settings: {
          provider: provider,
          baseURL: providerSettings.baseURL,
          model: providerSettings.model,
          apiKey: providerSettings.apiKey,
          temperature: settings.temperature
        }
      }),
    })

    // 解析响应
    const data = await response.json()

    // 返回数据，确保所有字段都存在
    return {
      text: data.text || "无可用的响应文本",
      task_type: data.task_type || "LOCATION_LIST",
      locations: Array.isArray(data.locations) ? data.locations : [],
      polylines: Array.isArray(data.polylines) ? data.polylines : [],
      error: !!data.error,
    }
  } catch (error) {
    console.error("生成响应时出错:", error)

    // 返回错误响应
    return {
      text: `生成响应时出错: ${error instanceof Error ? error.message : "未知错误"}。请稍后再试。`,
      task_type: "LOCATION_LIST",
      locations: [],
      polylines: [],
      error: true,
    }
  }
}

// 流式响应生成函数
export async function generateStreamingResponseClient(conversationHistory: Message[]) {
  if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    throw new Error("对话历史无效");
  }

  try {
    // 从 localStorage 获取模型设置
    const settingsStr = localStorage.getItem("model_settings")
    
    if (!settingsStr) {
      const legacyApiKey = localStorage.getItem("openai_api_key")
      if (!legacyApiKey) {
        throw new Error("缺少模型设置。请先配置您的 AI 模型。");
      }
      
      // 使用旧版 API 密钥（兼容性支持）
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": legacyApiKey,
        },
        body: JSON.stringify({ conversationHistory }),
      })
      
      if (!response.ok || !response.body) {
        throw new Error(`流式响应失败: ${response.status} ${response.statusText}`);
      }
      
      return streamAsyncIterable(response.body);
    }
    
    // 解析模型设置
    const settings: ModelSettings = JSON.parse(settingsStr)
    const provider = settings.provider
    const providerSettings = settings.providerSettings?.[provider] || {
      baseURL: "",
      model: "",
      apiKey: ""
    }
    
    // 发送请求到流式 API 路由
    const response = await fetch("/api/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        conversationHistory,
        settings: {
          provider: provider,
          baseURL: providerSettings.baseURL,
          model: providerSettings.model,
          apiKey: providerSettings.apiKey,
          temperature: settings.temperature
        }
      }),
    })
    
    if (!response.ok || !response.body) {
      throw new Error(`流式响应失败: ${response.status} ${response.statusText}`);
    }
    
    return streamAsyncIterable(response.body);
  } catch (error) {
    console.error("创建流式响应时出错:", error);
    throw error;
  }
}

// 辅助函数：将ReadableStream转换为异步迭代器
async function* streamAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      
      // 解码二进制数据为文本
      const chunk = decoder.decode(value, { stream: true });
      
      // 处理流中的事件
      if (chunk) {
        // 提取事件数据
        const lines = chunk
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => line.replace(/^data: /, '').trim());
        
        for (const line of lines) {
          if (line === '[DONE]') {
            return;
          }
          
          try {
            if (line) {
              // 如果是JSON格式的内容，解析它
              if (line.startsWith('{')) {
                const parsed = JSON.parse(line);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  yield parsed.choices[0].delta.content;
                }
              } else {
                // 否则，直接返回文本
                yield line;
              }
            }
          } catch (e) {
            console.warn('解析流数据出错:', e, line);
            // 如果解析失败但仍有内容，返回原始内容
            if (line) {
              yield line;
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
