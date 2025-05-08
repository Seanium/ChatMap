import { type NextRequest, NextResponse } from "next/server"
import { getMockResponse } from "@/lib/mock-data"
import OpenAI from "openai"; // Ensure OpenAI is imported

interface Message {
  role: string;
  content: string;
}

interface ModelSettings {
  provider: string;
  baseURL: string;
  model: string;
  apiKey: string;
  temperature: number;
}

export async function POST(req: NextRequest) {
  let query = "";
  let settings: ModelSettings | null = null;
  let conversationHistory: Message[] = [];
  
  try {
    // 1. Parse request body and retrieve model settings
    try {
      const body = await req.json();
      query = body.query || "";
      conversationHistory = body.conversationHistory || [];
      
      if (body.settings) {
        settings = body.settings as ModelSettings;
      } else if (req.headers.get("x-api-key")) {
        // Backward compatibility for old API key handling
        settings = {
          provider: "openai",
          baseURL: "https://api.openai.com/v1", // Standard OpenAI base URL
          model: "gpt-4o", 
          apiKey: req.headers.get("x-api-key") || "",
          temperature: 0.7,
        };
      }
      
      if (!settings || !settings.apiKey || !settings.baseURL || !settings.model) {
        return NextResponse.json(
          {
            text: "模型配置不完整或无效。请检查您的 AI 模型设置（API密钥、BaseURL、模型名称）。",
            locations: [],
            error: true,
          },
          { status: 401 }, // Unauthorized
        );
      }
    } catch (error) {
      console.error("解析请求体时出错:", error);
      return NextResponse.json(
        {
          text: "无效的请求体。请提供有效的查询。",
          locations: [],
          error: true,
        },
        { status: 400 }, // Bad Request
      );
    }

    if (!query) {
      return NextResponse.json(
        {
          text: "缺少查询参数。请提供有效的查询。",
          locations: [],
          error: true,
        },
        { status: 400 }, // Bad Request
      );
    }

    // 2. Call AI model API using the openai library
    try {
      console.log(`[API Route] 使用设置调用 AI 模型: BaseURL=${settings.baseURL}, Model=${settings.model}, Temperature=${settings.temperature}`);
      
      // 根据提供商调整API路径
      let baseURL = settings.baseURL;
      
      // 确保baseURL不包含具体的API路径（如'/chat/completions'）
      if (settings.provider === "openai" && baseURL.includes("/chat/completions")) {
        baseURL = baseURL.replace("/chat/completions", "");
      } else if (settings.provider === "siliconflow" && baseURL.includes("/chat/completions")) {
        baseURL = baseURL.replace("/chat/completions", "");
      }
      
      console.log(`[Generate API] 调整后的API端点: ${baseURL}, 模型: ${settings.model}, 提供商: ${settings.provider}`);
      
      const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: baseURL, // Allows custom baseURL from settings
      });

      // 构建所有消息，包括系统消息和对话历史
      const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
          role: "system",
          content: `你是ChatMap，一个专门从文本中提取地理信息的AI助手。
          你的任务是分析对话历史中最后一条助手消息，并提取其中的地理信息。
          不要生成新信息 - 只提取最后一条助手消息中明确提到的内容。
          
          首先，根据内容确定任务类型：
          1. 如果消息中没有提到特定的地理位置或地点，将task_type设为"NO_MAP_UPDATE"。
          2. 如果消息提到多个地点但没有指出它们之间的连接关系或顺序，将task_type设为"LOCATION_LIST"。
          3. 如果消息描述了地点之间的路线、行程、旅游路径或顺序游览计划，将task_type设为"ROUTE"。
          4. 如果消息只谈论单个地点，将task_type设为"LOCATION_LIST"（将单个地点视为只有一项的列表）。
          
          【路线任务识别指南】
          当消息中出现以下关键词或情况时，优先判断为"ROUTE"任务类型：
          - "路线"、"路径"、"行程"、"游览路线"、"旅游线路"、"从A到B"、"途经"、"路过"
          - 描述了多个地点的访问顺序，如"先去A，然后去B，最后到C"
          - 地点之间有明确的时间或顺序关系，如"第一天去A，第二天去B"
          - 使用了表示顺序的词语，如"首先"、"接着"、"随后"、"最后"、"然后"
          - 询问了如何从一个地点到达另一个地点
          - 涉及旅行规划，特别是跨越多个地点的旅行
          
          返回一个具有以下格式的JSON对象：
          {
            "task_type": "NO_MAP_UPDATE"或"LOCATION_LIST"或"ROUTE",
            "text": "复制助手最后一条消息的确切文本",
            "locations": [
              {
                "id": "1",
                "title": "地点名称（如消息中提到的）",
                "description": "简短描述（如消息中提供）",
                "latitude": 12.345, // 你需要确定坐标
                "longitude": 67.890 // 你需要确定坐标
              }
            ]
          }
          
          关键指南：
          1. 对于"NO_MAP_UPDATE"任务：返回空的locations数组。
          2. 对于"LOCATION_LIST"任务：必须填写locations数组，至少包含一个地点。
          3. 对于"ROUTE"任务：必须填写locations数组，包含按路线顺序排列的地点。
          4. 按照消息中出现的相同顺序提取地点。
          5. 不要添加消息中未提到的任何地点。
          6. 如果没有明确提到地点，返回空的locations数组。
          7. 对于坐标，使用你的地理知识提供准确的值。
          8. 【重要】如果用户原始问题中包含"路线"、"路径"、"行程"、"怎么去"等关键词，即使助手回答中没有明确路线，也倾向于将其识别为"ROUTE"任务。
          
          示例：
          
          1. "NO_MAP_UPDATE"示例：
          用户问："人工智能的未来是什么？"
          助手回答："人工智能的未来充满可能性，包括更高级的自然语言处理和更强大的问题解决能力。"
          你应返回：
          {
            "task_type": "NO_MAP_UPDATE",
            "text": "人工智能的未来充满可能性，包括更高级的自然语言处理和更强大的问题解决能力。",
            "locations": []
          }
          
          2. "LOCATION_LIST"示例：
          用户问："北京有哪些著名景点？"
          助手回答："北京的著名景点包括故宫、天安门广场、颐和园和长城。故宫是中国明清两代的皇家宫殿，天安门广场是世界上最大的城市广场之一。"
          你应返回：
          {
            "task_type": "LOCATION_LIST",
            "text": "北京的著名景点包括故宫、天安门广场、颐和园和长城。故宫是中国明清两代的皇家宫殿，天安门广场是世界上最大的城市广场之一。",
            "locations": [
              {
                "id": "1",
                "title": "故宫",
                "description": "中国明清两代的皇家宫殿",
                "latitude": 39.9163,
                "longitude": 116.3972
              },
              {
                "id": "2",
                "title": "天安门广场",
                "description": "世界上最大的城市广场之一",
                "latitude": 39.9054,
                "longitude": 116.3976
              },
              {
                "id": "3",
                "title": "颐和园",
                "description": "北京著名景点",
                "latitude": 39.9988,
                "longitude": 116.2752
              },
              {
                "id": "4",
                "title": "长城",
                "description": "北京著名景点",
                "latitude": 40.4319,
                "longitude": 116.5704
              }
            ]
          }
          
          3. "ROUTE"示例（明确路线）：
          用户问："从北京到上海的旅游路线"
          助手回答："从北京到上海的经典旅游路线可以是：先在北京游览故宫和长城，然后前往苏州游览拙政园，最后抵达上海游览外滩和东方明珠。"
          你应返回：
          {
            "task_type": "ROUTE",
            "text": "从北京到上海的经典旅游路线可以是：先在北京游览故宫和长城，然后前往苏州游览拙政园，最后抵达上海游览外滩和东方明珠。",
            "locations": [
              {
                "id": "1",
                "title": "故宫",
                "description": "北京景点",
                "latitude": 39.9163,
                "longitude": 116.3972
              },
              {
                "id": "2",
                "title": "长城",
                "description": "北京景点",
                "latitude": 40.4319,
                "longitude": 116.5704
              },
              {
                "id": "3",
                "title": "拙政园",
                "description": "苏州景点",
                "latitude": 31.3242,
                "longitude": 120.6293
              },
              {
                "id": "4",
                "title": "外滩",
                "description": "上海景点",
                "latitude": 31.2304,
                "longitude": 121.4904
              },
              {
                "id": "5",
                "title": "东方明珠",
                "description": "上海景点",
                "latitude": 31.2396,
                "longitude": 121.4998
              }
            ]
          }
          
          4. "ROUTE"示例（含有顺序关系）：
          用户问："北京三日游攻略"
          助手回答："北京三日游推荐，第一天参观故宫和天安门广场，第二天游览长城，第三天游览颐和园和圆明园。"
          你应返回：
          {
            "task_type": "ROUTE",
            "text": "北京三日游推荐，第一天参观故宫和天安门广场，第二天游览长城，第三天游览颐和园和圆明园。",
            "locations": [
              {
                "id": "1",
                "title": "故宫",
                "description": "北京第一天景点",
                "latitude": 39.9163,
                "longitude": 116.3972
              },
              {
                "id": "2",
                "title": "天安门广场",
                "description": "北京第一天景点",
                "latitude": 39.9054,
                "longitude": 116.3976
              },
              {
                "id": "3",
                "title": "长城",
                "description": "北京第二天景点",
                "latitude": 40.4319,
                "longitude": 116.5704
              },
              {
                "id": "4",
                "title": "颐和园",
                "description": "北京第三天景点",
                "latitude": 39.9988,
                "longitude": 116.2752
              },
              {
                "id": "5",
                "title": "圆明园",
                "description": "北京第三天景点",
                "latitude": 40.0097,
                "longitude": 116.2984
              }
            ]
          }
          
          记住，你的目标是准确提取信息，而不是创建新内容。尤其要注意用户询问中的路线和顺序提示词，确保正确识别路线任务。
        `
      };

      // 构建消息历史
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        systemMessage
      ];

      // Find the last assistant message in the conversation history
      let lastAssistantMessage = "";
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        // Reverse through history to find the last assistant message
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          if (conversationHistory[i].role === "assistant") {
            lastAssistantMessage = conversationHistory[i].content;
            break;
          }
        }
      }

      // If we found a last assistant message, use it for extraction
      // Otherwise fall back to normal query processing
      if (lastAssistantMessage) {
        messages.push({
          role: "user",
          content: `Extract geographic information from this text: "${lastAssistantMessage}"`
        });
      } else {
        // If no assistant message found (e.g., first query), add the full conversation
        // This is the fallback to the original behavior
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          for (const msg of conversationHistory) {
            messages.push({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content
            });
          }
        }
        
        // Add current query
        messages.push({
          role: "user",
          content: query,
        });
      }
      
      const completion = await openai.chat.completions.create({
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        response_format: { type: "json_object" }, // Request JSON output
      });
        
      console.log("[API Route] AI 模型原始完成对象:", JSON.stringify(completion, null, 2)); // 打印完整的 completion 对象
      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        console.error("[API Route] AI 模型返回了空的内容。原始完成对象:", completion);
        throw new Error("AI 模型返回了空的内容。");
      }

      // 3. Parse the content from AI model
      try {
        console.log("[API Route] 尝试解析 AI 响应内容:", responseContent);
        const parsedResponse = JSON.parse(responseContent);
        console.log("[API Route] AI 响应成功解析。", parsedResponse);

        return NextResponse.json({
          text: parsedResponse.text || "无可用的响应文本", // Fallback if text field is missing
          task_type: parsedResponse.task_type || "LOCATION_LIST", // 默认为地点列表类型
          locations: Array.isArray(parsedResponse.locations) ? parsedResponse.locations : [],
          error: false,
        });
      } catch (parseError: unknown) {
        console.error("[API Route] 解析 AI 响应 JSON 时出错:", parseError, "\n原始响应内容:", responseContent);
        const errorText = parseError instanceof Error ? parseError.message : "未知解析错误";
        return NextResponse.json({
          text: `解析 AI 响应时出错: ${errorText}。\n收到的内容 (前200字符): ${responseContent.substring(0, 200)}...`,
          locations: [],
          error: true,
        }, { status: 500 }); // Internal Server Error
      }
    } catch (apiError: unknown) {
      console.error("[API Route] 调用 AI API 时出错:", apiError);
      let errorMessage = "调用 AI API 时发生未知错误。";
      let errorStatus = 500; // Default to Internal Server Error

      if (apiError instanceof OpenAI.APIError) {
        errorMessage = `AI API 错误: ${apiError.status || 'N/A'} ${apiError.name || 'UnknownError'} - ${apiError.message}`;
        errorStatus = typeof apiError.status === 'number' ? apiError.status : 500;
      } else if (apiError instanceof Error) {
        // Handle generic errors that might not be OpenAI.APIError instances
        errorMessage = `调用 AI API 时发生内部错误: ${apiError.message}`;
      }

      return NextResponse.json({
        text: `${errorMessage} 请检查您的模型设置和网络连接，或稍后再试。`,
        locations: [],
        error: true,
      }, { status: errorStatus });
    }
  } catch (error: unknown) {
    // Catch-all for unexpected errors early in the request processing
    console.error("[API Route] API 路由中的未处理的顶层错误:", error);
    return NextResponse.json({
      text: `处理您的查询时发生意外错误: ${error instanceof Error ? error.message : "未知服务器内部错误"}。`,
      locations: [],
      error: true,
    }, { status: 500 }); // Internal Server Error
  }
}

export async function GET(req: NextRequest) {
  console.log("标准API /api/generate GET请求处理!");
  return NextResponse.json({ message: "标准API /api/generate 端点成功访问!" });
}
