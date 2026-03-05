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

export async function generateBuddyImage(prompt: string): Promise<string> {
  // Directly build the URL so the React <img> tag loads it natively.
  // This bypasses any strict CORS or 403 blocks that Pollinations applies to JavaScript `fetch` and `Image` objects.
  const seed = Math.floor(Math.random() * 1000000);
  const encPrompt = encodeURIComponent(prompt + " white background clear vector style");
  const timestamp = Date.now();

  return `https://image.pollinations.ai/prompt/${encPrompt}?width=512&height=512&seed=${seed}&nologo=true&model=turbo&cb=${timestamp}`;
}

export async function generateEnvironmentImage(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 1000000);
  const encPrompt = encodeURIComponent(prompt + " 8k highly detailed colorful");
  const timestamp = Date.now();

  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=1024&height=576&seed=${seed}&nologo=true&model=flux&cb=${timestamp}`;
  return `url('${url}') center/cover no-repeat`;
}

export async function generateGameScenario(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 1000000);
  const encPrompt = encodeURIComponent(prompt + " vibrant kids game background cartoon");
  const timestamp = Date.now();

  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=1024&height=576&seed=${seed}&nologo=true&model=flux&cb=${timestamp}`;
  return `url('${url}') center/cover no-repeat`;
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
    "Eres un cuentacuentos amigable para niños. Tu objetivo es hacerlos sentir valientes y felices. Escribe siempre en español.",
    `Escribe una historia muy corta, alentadora y mágica para un niño en un hospital sobre ${topic}. Máximo 100 palabras. Usa emojis.`,
    200
  );
  return result || "¡Eres el héroe de tu propia historia! ✨🦸";
}

export async function generateCheerMessage() {
  const result = await callTextAPI(
    "Eres un compañero virtual amigable para niños. Tu objetivo es hacerlos sonreír.",
    "Genera un mensaje de ánimo muy corto (máximo 15 palabras) y divertido para un niño en un hospital. Usa emojis. En ESPAÑOL. SOLO EL MENSAJE, nada más.",
    50
  );
  return result || "¡Eres un campeón! ✨";
}
