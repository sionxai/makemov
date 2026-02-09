
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 단일 이미지를 참조하여 생성
 */
export const generateImageWithReference = async (
  prompt: string, 
  referenceBase64: string, 
  mimeType: string = 'image/png',
  aspectRatio: AspectRatio = '1:1'
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: referenceBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: aspectRatio
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

/**
 * 여러 이미지를 동시에 참조하여 생성 (양식 포맷 생성 등에 사용)
 */
export const generateImageWithMultipleReferences = async (
  prompt: string,
  images: { data: string; mimeType: string }[],
  aspectRatio: AspectRatio = '1:1'
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const parts = images.map(img => ({ inlineData: img }));
    parts.push({ text: prompt } as any);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: aspectRatio
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Multi-Reference Generation Error:", error);
    throw error;
  }
};

export const applyToneAndManner = async (
  targetBase64: string,
  styleBase64: string,
  mimeType: string = 'image/png',
  aspectRatio: AspectRatio = '1:1'
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const prompt = "Please modify this target image to strictly follow the tone, color palette, lighting, and overall aesthetic manner of the provided style reference image. Keep the main subject and composition of the target image but apply the visual style of the reference.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: styleBase64, mimeType } },
          { inlineData: { data: targetBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: aspectRatio
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Tone and Manner Error:", error);
    throw error;
  }
};
