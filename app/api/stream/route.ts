import { type NextRequest } from "next/server"
import OpenAI from "openai"

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
  try {
    // 解析请求体
    const body = await req.json();
    const conversationHistory: Message[] = body.conversationHistory || [];
    let settings: ModelSettings | null = body.settings || null;
    
    // 验证设置
    if (!settings) {
      // 尝试从请求头中获取旧版API密钥
      const legacyApiKey = req.headers.get("x-api-key");
      if (!legacyApiKey) {
        return new Response(
          JSON.stringify({ error: "缺少模型配置或API密钥" }),
          { 
            status: 401, 
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // 使用旧版API密钥
      settings = {
        provider: "openai",
        baseURL: "https://api.openai.com/v1",
        model: "gpt-4o",
        apiKey: legacyApiKey,
        temperature: 0.7,
      };
    }
    
    // 验证对话历史
    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: "缺少有效的对话历史" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // 根据提供商调整API路径
    let baseURL = settings.baseURL;
    
    // 确保baseURL不包含具体的API路径（如'/chat/completions'）
    if (settings.provider === "openai" && baseURL.includes("/chat/completions")) {
      baseURL = baseURL.replace("/chat/completions", "");
    } else if (settings.provider === "siliconflow" && baseURL.includes("/chat/completions")) {
      baseURL = baseURL.replace("/chat/completions", "");
    }
    
    console.log(`[Stream API] 使用API端点: ${baseURL}, 模型: ${settings.model}, 提供商: ${settings.provider}`);
    
    // 创建OpenAI客户端
    const openai = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: baseURL,
    });
    
    // 构建系统消息
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "system",
      content: `你是ChatMap，一个专门提供地理、旅行和位置信息的AI助手。
      请生成友好、有帮助的自然语言回答，内容专注于用户的实际需求。
      
      当用户询问地理位置相关问题时，请提供准确的回答：
      1. 如果用户询问的是多个地点（如"北京的旅游景点"、"纽约的餐厅"），清晰列出这些地点，简洁描述每个地点。
      
      2. 如果用户询问的是路线或行程（如"从北京到上海的路线"、"东京一日游"），特别注意：
         - 按顺序列出路线上的地点，明确指出访问顺序
         - 使用"先...然后...最后..."或"第一天...第二天..."等词语表达顺序关系
         - 说明如何从一个地点到另一个地点
         - 当用户询问包含"路线"、"路径"、"行程"、"游览路线"、"旅游线路"、"怎么去"等词语时，
           尽量以路线顺序方式组织回答，而不是简单列举地点
      
      3. 如果用户询问的是单个地点或一般信息，提供关于该地点的详细信息。
      
      你的回答应当是自然流畅的文本，不需要刻意标注坐标或地理信息。后续会有专门的系统提取地理位置信息用于地图显示。
      
      保持语言简洁、条理清晰，让用户容易理解。确保回答准确、有帮助，能为用户提供实际价值。`
    };
    
    // 准备消息
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }))
    ];
    
    try {
      // 创建流式完成请求
      const stream = await openai.chat.completions.create({
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        stream: true,
      });
      
      // 设置响应头
      const headers = new Headers();
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      
      // 创建一个新的流
      const encoder = new TextEncoder();
      
      const responseStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
        cancel() {
          // 当流被取消时，关闭 OpenAI 流
          if (stream.controller) {
            stream.controller.abort();
          }
        }
      });
      
      // 返回流式响应
      return new Response(responseStream, {
        headers: headers,
      });
    } catch (apiError) {
      console.error("API调用错误:", apiError);
      throw new Error(`API调用失败: ${apiError instanceof Error ? apiError.message : '未知API错误'}`);
    }
    
  } catch (error) {
    console.error("流式响应处理错误:", error);
    
    // 友好的错误消息
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    
    return new Response(
      JSON.stringify({ error: `流式响应生成失败: ${errorMessage}` }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function GET(req: NextRequest) {
  return new Response(
    JSON.stringify({ message: "流式API端点就绪" }),
    { 
      status: 200, 
      headers: { "Content-Type": "application/json" }
    }
  );
} 