import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";

// Initialize Gemini AI (For Images Only)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Groq AI (For Ultra-fast Text)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });

const cache: Record<string, string> = {};

async function getCachedImage(key: string, generator: () => Promise<string | null>) {
  // Check in-memory cache
  if (cache[key]) return cache[key];

  // Check localStorage
  const stored = localStorage.getItem(`v2_cache_${key}`);
  if (stored) {
    cache[key] = stored;
    return stored;
  }

  const result = await generator();
  if (result) {
    cache[key] = result;
    try {
      localStorage.setItem(`v2_cache_${key}`, result);
    } catch (e) {
      // LocalStorage might be full
      console.warn("Cache full, could not save to localStorage");
    }
  }
  return result;
}

async function removeWhiteBackground(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Remove white/near-white background
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If color is close to white, make it transparent
        if (r > 235 && g > 235 && b > 235) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export async function generateBuddyImage(prompt: string) {
  return getCachedImage(`buddy_${prompt}`, async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `3D character design, Stumble Guys style, energetic pose, ${prompt}. Vibrant colors, rounded blocky shapes, expressive face, high-quality rendering, game asset, 4k, fun and friendly. ISOLATED ON SOLID WHITE BACKGROUND, NO SHADOWS.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64 = `data:image/png;base64,${part.inlineData.data}`;
          return await removeWhiteBackground(base64);
        }
      }
    } catch (error) {
      console.error("Error generating buddy image:", error);
    }
    return null;
  });
}

export async function generateGameScenario(theme: string) {
  return getCachedImage(`scenario_${theme}`, async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `3D video game level design, ${theme} theme, Stumble Guys aesthetic. Colorful obstacles, floating platforms, vibrant sky, high detail, fun atmosphere, 4k, isometric view.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error("Error generating game scenario:", error);
    }
    return null;
  });
}

export async function generateStoryContent(topic: string) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Eres un cuentacuentos amigable para niños. Tu objetivo es hacerlos sentir valientes y felices. Escribe siempre en español.",
        },
        {
          role: "user",
          content: `Escribe una historia muy corta, alentadora y mágica para un niño en un hospital sobre ${topic}. Debe estar en ESPAÑOL. Máximo 100 palabras. Usa emojis.`,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
    });
    return completion.choices[0]?.message?.content || "¡Oh no! Mi libro de cuentos se quedó sin magia.";
  } catch (error) {
    console.error("Error generating story with Groq:", error);
    return "¡Oh no! Mi libro de cuentos se ha quedado sin tinta mágica por un momento. ¡Inténtalo de nuevo! ✨";
  }
}

export async function generateCheerMessage() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Eres un compañero virtual amigable para niños. Tu objetivo es hacerlos sonreír.",
        },
        {
          role: "user",
          content: "Genera un mensaje de ánimo muy corto (máximo 15 palabras) y divertido para un niño en un hospital. Usa emojis. En ESPAÑOL. NO MANDES TEXTO EXTRA, SOLO EL MENSAJE CORTITO DIRECTAMENTE.",
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.8,
      max_tokens: 50,
      top_p: 1,
    });
    return completion.choices[0]?.message?.content || "¡Eres un campeón! ✨";
  } catch (error) {
    console.error("Error generating cheer message with Groq:", error);
    return "¡Eres un campeón! ✨";
  }
}

export async function generateEnvironmentImage(prompt: string) {
  return getCachedImage(`env_${prompt}`, async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `3D cartoon style game environment, ${prompt}. Soft lighting, warm colors, cozy atmosphere, high detail, 4k, game background.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error("Error generating environment image:", error);
    }
    return null;
  });
}
