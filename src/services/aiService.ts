// aiService.ts
// Buddy: custom Goku SVG (default) + DiceBear per style
// Backgrounds: Hugging Face FLUX.1-schnell (real AI) with CSS gradient fallbacks
// Text: Groq via /api/generate-text proxy

// Goku-colored circular placeholder shown while HF generates the real image
const GOKU_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#FF8C00"/><text x="60" y="75" text-anchor="middle" font-size="52" font-family="serif">🐉</text></svg>')}`;

const BUDDY_PROMPTS: Record<string, string> = {
  default: "Goku, Son Goku, Dragon Ball, anime style, orange martial arts gi, spiky black hair, energetic expression, vibrant colors, white background",
  superhero: "Goku as a superhero with a red cape, heroic pose, anime style, white background",
  astronaut: "Goku in a NASA space suit, holding a helmet, anime style, white background",
  pirate: "Goku as a pirate with a captain hat, adventurous pose, anime style, white background",
  mago: "Goku as a wizard with a magic staff and mystical aura, anime style, white background",
  robot: "Goku as a cyborg robot with mechanical parts, anime style, white background",
};

// --- Scene Generation ---
export const MAIN_SCENE_PROMPT = "cute chibi anime hero with spiky black hair, orange blue outfit, friendly smile, jumping on floating islands, colorful fantasy sky world, children video game environment, pixar style lighting, 3D cartoon game art, vibrant colors, highly detailed";

export async function generateAIImage(prompt: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for DALL-E 3

  try {
    const res = await fetch("/api/openai-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const { image } = await res.json();
      if (image) return image;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("OpenAI Image error:", err);
  }

  // Fallback to HF instantly if OpenAI fails
  try {
    const hfRes = await fetch("/api/hf-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (hfRes.ok) {
      const { image } = await hfRes.json();
      if (image) return image;
    }
  } catch (err) {
    console.error("HF Fallback failed:", err);
  }

  // Beautiful Dicebear fallback for Goku if API fails
  const seed = Math.floor(Math.random() * 10000);
  if (prompt.toLowerCase().includes("goku")) {
    return `https://api.dicebear.com/9.x/micah/svg?seed=Felix&backgroundColor=ff8c00&hair=fonze&baseColor=f9c9b6&clothing=shirt`;
  }
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a`;
}

export async function generateBuddyImage(prompt: string): Promise<string> {
  // Simplified high-impact prompt
  const fullPrompt = `${prompt}, high quality anime illustration, masterpiece`;
  const img = await generateAIImage(fullPrompt);
  return img || `https://api.dicebear.com/9.x/adventurer/svg?seed=Goku&backgroundColor=ff8c00`;
}

export async function generateEnvironmentImage(prompt: string): Promise<string> {
  const fullPrompt = `${prompt}, stunning game landscape, 8k resolution, cinematic lighting, concept art, vibrant, immersive, masterpiece`;
  const img = await generateAIImage(fullPrompt);
  if (img) return `url('${img}') center/cover no-repeat`;

  // Gorgeous robust fallbacks based on room type
  if (prompt.toLowerCase().includes("bosque")) return `linear-gradient(135deg, #2b5876 0%, #4e4376 100%)`;
  if (prompt.toLowerCase().includes("galaxia")) return `linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)`;
  if (prompt.toLowerCase().includes("castillo")) return `linear-gradient(135deg, #7b4397 0%, #dc2430 100%)`;

  return `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
}

export async function generateGameScenario(prompt: string): Promise<string | null> {
  const fullPrompt = `${prompt}, high quality game world, children adventure style, vibrant`;
  return generateAIImage(fullPrompt);
}

export async function generateMainSceneUrl(): Promise<string | null> {
  return generateAIImage(MAIN_SCENE_PROMPT);
}

// Old functions removed for direct URL loading.

// ── Text generation via OpenAI proxy ──
async function callTextAPI(systemPrompt: string, userPrompt: string, maxTokens = 200): Promise<string | null> {
  try {
    const res = await fetch("/api/openai-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { text } = await res.json();
    return text || null;
  } catch (err) {
    console.error("OpenAI Text API error:", err);
    return null;
  }
}

export async function generateStoryContent(topic: string) {
  const result = await callTextAPI(
    "Eres un cuentacuentos amigable para niños. Tu objetivo es hacerlos vivir aventuras épicas. Escribe siempre en español.",
    `Escribe una historia muy corta, alentadora y mágica para un niño sobre ${topic}. Máximo 100 palabras. Usa emojis.`,
    200
  );
  return result || "¡Eres el héroe de tu propia historia! ✨🦸";
}

export async function generateCheerMessage() {
  const result = await callTextAPI(
    "Eres un compañero virtual amigable para niños. Tu objetivo es hacerlos sonreír.",
    "Genera un mensaje de ánimo muy corto (máximo 15 palabras) y divertido para un jugador. Usa emojis. En ESPAÑOL. SOLO EL MENSAJE, nada más.",
    50
  );
  return result || "¡Eres un campeón! ✨";
}
