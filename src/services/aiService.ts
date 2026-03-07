// aiService.ts
// Buddy: custom Goku SVG (default) + DiceBear per style
// Backgrounds: Hugging Face FLUX.1-schnell (real AI) with CSS gradient fallbacks
// Text: Groq via /api/generate-text proxy

// Goku-colored circular placeholder shown while HF generates the real image
const GOKU_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#FF8C00"/><text x="60" y="75" text-anchor="middle" font-size="52" font-family="serif">🐉</text></svg>')}`;

const BUDDY_PROMPTS: Record<string, string> = {
  default: "Son Goku from Dragon Ball Z, iconic orange martial arts gi with blue undershirt and belt, spiky black hair, friendly and energetic expression, full body standing pose, anime style, high quality illustration, white background",
  superhero: "cute superhero child version of goku with a red cape and heroic mask, colorful suit, standing pose, anime style, white background",
  astronaut: "Goku wearing a detailed high-tech astronaut space suit, holding a helmet, smiling, space hero theme, anime style, white background",
  pirate: "Goku as a friendly pirate captain with a captain hat and treasure map, adventurous pose, anime style, white background",
  mago: "Goku as a powerful martial arts wizard with a glowing magic aura and a mystical staff, anime style, white background",
  robot: "Cybernetic Goku, android version with glowing blue energy lines and robotic armor, anime style, white background",
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
  // Enhanced prompt for premium 3D anime look, very specific for Goku
  const fullPrompt = `${prompt}, masterpiece, 8k resolution, cinematic lighting, sharp focus, 3D render style mixed with anime, vibrant colors, centered, full body, white background`;
  const img = await generateAIImage(fullPrompt);
  // Using a more suitable Goku-like fallback seed if everything fails
  return img || `https://api.dicebear.com/9.x/adventurer/svg?seed=Goku&backgroundColor=ff8c00`;
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
