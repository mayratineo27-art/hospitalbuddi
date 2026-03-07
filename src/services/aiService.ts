// aiService.ts
// Buddy: custom Goku SVG (default) + DiceBear per style
// Backgrounds: Hugging Face FLUX.1-schnell (real AI) with CSS gradient fallbacks
// Text: Groq via /api/generate-text proxy

// Goku-colored circular placeholder shown while HF generates the real image
const GOKU_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#FF8C00"/><text x="60" y="75" text-anchor="middle" font-size="52" font-family="serif">🐉</text></svg>')}`;

const BUDDY_PROMPTS: Record<string, string> = {
  default: "Goku from Dragon Ball Super, chibi anime style, orange gi, spiky black hair, friendly smile, fullbody, white background, highly detailed cartoon",
  superhero: "cartoon superhero child with cape and mask, flying pose, colorful suit, white background, anime style",
  astronaut: "cute cartoon astronaut child in space suit with helmet, floating, white background, anime chibi style",
  pirate: "friendly cartoon pirate child with hat and eye patch, white background, anime chibi style",
  mago: "little cartoon wizard with magic hat and wand, sparks, white background, anime chibi style",
  robot: "cute cartoon robot child with glowing eyes, metallic body, white background, anime chibi style",
};

export async function generateAIImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("/api/gemini-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      // Fallback to Hugging Face if Gemini fails
      console.warn("Gemini failed, falling back to HF...");
      const hfRes = await fetch("/api/hf-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!hfRes.ok) throw new Error(await hfRes.text());
      const { image } = await hfRes.json();
      return image || null;
    }
    const { image } = await res.json();
    return image || null;
  } catch (err) {
    console.error("AI Image error:", err);
    return null;
  }
}

export async function generateBuddyImage(prompt: string): Promise<string> {
  // Enhanced prompt for premium 3D game character look
  const fullPrompt = `${prompt}, 3D Disney Pixar style, cute game character, vibrant colors, soft lighting, highly detailed, centered, full body, white background, masterpiece`;
  const img = await generateAIImage(fullPrompt);
  return img || `https://api.dicebear.com/9.x/adventurer/svg?seed=${prompt}&backgroundColor=b6e3f4`;
}

export async function generateEnvironmentImage(prompt: string): Promise<string> {
  // Enhanced prompt for premium game environment look
  const fullPrompt = `${prompt}, stunning game landscape, 8k resolution, cinematic lighting, concept art, vibrant, immersive, masterpiece`;
  const img = await generateAIImage(fullPrompt);
  if (img) return `url('${img}') center/cover no-repeat`;

  // Fallback to a nice gradient if AI fails
  return `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
}

export async function generateGameScenario(prompt: string): Promise<string> {
  return generateEnvironmentImage(prompt);
}

// Old functions removed for direct URL loading.

// ── Text generation via Groq proxy ──
async function callTextAPI(systemPrompt: string, userPrompt: string, maxTokens = 200): Promise<string | null> {
  try {
    const res = await fetch("/api/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { text } = await res.json();
    return text || null;
  } catch (err) {
    console.error("Text API error:", err);
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
