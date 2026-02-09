import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = String(reader.result || '').split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

function getImageDataFromResponse(response) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    if (part?.inlineData?.data) return part.inlineData.data;
  }
  return null;
}

async function generateImage({ apiKey, parts, aspectRatio = '1:1' }) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      imageConfig: {
        imageSize: '2K',
        aspectRatio,
      },
    },
  });

  const data = getImageDataFromResponse(response);
  if (!data) {
    throw new Error('No image data returned from Gemini');
  }
  return `data:image/png;base64,${data}`;
}

export async function generateImageWithReference({
  apiKey,
  prompt,
  referenceBase64,
  mimeType = 'image/png',
  aspectRatio = '1:1',
}) {
  return generateImage({
    apiKey,
    aspectRatio,
    parts: [
      { inlineData: { data: referenceBase64, mimeType } },
      { text: prompt },
    ],
  });
}

export async function generateImageWithMultipleReferences({
  apiKey,
  prompt,
  images,
  aspectRatio = '1:1',
}) {
  const parts = images.map((img) => ({ inlineData: img }));
  parts.push({ text: prompt });
  return generateImage({ apiKey, parts, aspectRatio });
}

export async function applyToneAndManner({
  apiKey,
  targetBase64,
  styleBase64,
  mimeType = 'image/png',
  aspectRatio = '1:1',
}) {
  const prompt = 'Modify the target image to follow the tone, color palette, lighting, and overall style of the style reference. Keep composition and main subject identity.';
  return generateImage({
    apiKey,
    aspectRatio,
    parts: [
      { inlineData: { data: styleBase64, mimeType } },
      { inlineData: { data: targetBase64, mimeType } },
      { text: prompt },
    ],
  });
}

