import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Safely initialize GenAI only if key exists (handled gracefully in UI)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generatePostEnhancement = async (currentContent: string, instruction: string): Promise<string> => {
  if (!ai) {
    throw new Error("API Key is missing");
  }

  try {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      你是一位专业的技术作家和编辑。请使用中文回答。
      
      用户指令: ${instruction}
      
      当前内容 (Markdown格式):
      "${currentContent}"
      
      请根据指令提供改进后的或生成的内容。
      只返回原始内容文本（Markdown格式），除非被要求，否则不要用代码块包裹整个输出。
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};