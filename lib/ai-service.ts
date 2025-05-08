"use server"

// 获取配置
const getAIConfig = () => {
  return {
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || "gpt-4o",
    temperature: Number.parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  }
}

// 定义接口
interface Location {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface MapResponse {
  text: string;
  locations: Location[];
  polylines?: [number, number][][];
  error?: boolean;
}

export async function generateMapResponse(query: string): Promise<MapResponse> {
  const config = getAIConfig()

  // 检查 API 密钥是否可用
  if (!config.apiKey) {
    console.error("OpenAI API 密钥缺失。请设置 OPENAI_API_KEY 环境变量。")
    return {
      text: "无法连接到 AI 服务。请确保已设置 OpenAI API 密钥。",
      locations: [],
      error: true,
    }
  }

  try {
    console.log("为查询生成响应:", query)

    // 使用 fetch API 直接调用 OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: `You are ChatMap, an AI assistant specialized in geography, travel, and location-based information. 
            Provide accurate, detailed responses about places, routes, and points of interest.
            
            Always respond with valid JSON in the following format:
            {
              "text": "Your detailed textual response to the user's query",
              "locations": [
                {
                  "id": "unique-id-1",
                  "title": "Location name",
                  "description": "Brief description of this location",
                  "latitude": 12.345,
                  "longitude": 67.890
                }
              ],
              "polylines": [[longitude1, latitude1], [longitude2, latitude2], ...] // Optional, for routes
            }
            
            For routes or journeys, include polylines connecting the locations in order.
            For general location queries, return relevant points of interest.
            Ensure all latitude and longitude values are valid geographic coordinates.
            `,
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: config.temperature,
        response_format: { type: "json_object" },
      }),
    })

    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API 错误: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    // 解析响应
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    if (!content) {
      throw new Error("OpenAI 返回了空响应")
    }

    // 解析 JSON 响应
    try {
      const parsedResponse = JSON.parse(content)
      console.log("AI 响应:", parsedResponse)

      // 验证响应结构
      if (!parsedResponse.text || !Array.isArray(parsedResponse.locations)) {
        throw new Error("无效的响应结构")
      }

      // 验证每个位置都有必需的字段
      parsedResponse.locations = parsedResponse.locations.map((location: any, index: number) => {
        if (!location.id) location.id = `location-${index + 1}`
        if (!location.title) location.title = `位置 ${index + 1}`
        if (!location.description) location.description = "没有可用的描述"

        // 确保纬度和经度是数字且在有效范围内
        const lat = Number.parseFloat(location.latitude)
        const lng = Number.parseFloat(location.longitude)

        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error(`位置的纬度无效: ${location.title}`)
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error(`位置的经度无效: ${location.title}`)
        }

        return {
          ...location,
          latitude: lat,
          longitude: lng,
        }
      })

      return parsedResponse as MapResponse
    } catch (e: any) {
      console.error("解析 AI 响应时出错:", e)
      throw new Error(`解析 AI 响应失败: ${e.message}`)
    }
  } catch (error: any) {
    console.error("生成 AI 响应时出错:", error)

    // 返回用户友好的错误消息
    return {
      text: `处理您的查询时出错: ${error.message || "未知错误"}。请稍后再试或尝试不同的查询。`,
      locations: [],
      error: true,
    }
  }
}

