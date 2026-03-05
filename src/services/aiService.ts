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
  const hfImg = await callHFImage(prompt);
  return hfImg || GOKU_PLACEHOLDER;
}

// ── CSS gradient fallbacks (instant, shown before HF image loads) ──
const GRADIENTS: Record<string, string> = {
  "galaxia": "radial-gradient(ellipse at top, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "castillo": "linear-gradient(135deg, #8B5E3C 0%, #D2A679 50%, #8B5E3C 100%)",
  "laboratorio": "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 50%, #00d2ff 100%)",
  "bosque": "linear-gradient(135deg, #1a4a0a 0%, #3a7d2e 50%, #52b812 100%)",
  "espacio": "radial-gradient(ellipse at top, #070818 0%, #1a1a4e 50%, #0e0e2c 100%)",
  "jungla": "linear-gradient(160deg, #1a4a0a 0%, #52b812 60%, #1e6b06 100%)",
  "dulces": "linear-gradient(135deg, #ff9ff3 0%, #ffeaa7 50%, #fd79a8 100%)",
  "hielo": "linear-gradient(135deg, #a8edea 0%, #74b9ff 60%, #dfe6f9 100%)",
};

function getGradient(keyword: string): string {
  const k = keyword.toLowerCase();
  for (const [key, grad] of Object.entries(GRADIENTS)) {
    if (k.includes(key)) return grad;
  }
  return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
}

// In-memory cache for images
const imageCache: Record<string, string> = {};

async function callHFImage(prompt: string, isBackground = false): Promise<string | null> {
  const cacheKey = prompt + (isBackground ? "_bg" : "_buddy");
  if (imageCache[cacheKey]) return imageCache[cacheKey];

  try {
    // Generate different seeds to avoid caching the same image for different prompts
    const seed = Math.floor(Math.random() * 1000000);
    const width = isBackground ? 1024 : 512;
    const height = isBackground ? 576 : 512;
    const model = isBackground ? "flux" : "turbo";

    // Pollinations.ai is extremely fast and free, and supports CORS directly.
    // It's much more stable than HF Free Tier for these types of requests.
    const encPrompt = encodeURIComponent(prompt + (isBackground ? " 8k highly detailed colorful" : " white background clear vector style"));
    const imageUrl = `https://image.pollinations.ai/prompt/${encPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`;

    // Fetch it just to trigger generation and cache the result
    const res = await fetch(imageUrl);
    if (res.ok) {
      imageCache[cacheKey] = imageUrl;
      return imageUrl;
    }
  } catch (err) {
    console.error("Image generation failed:", err);
  }

  return null;
}

export async function generateEnvironmentImage(prompt: string): Promise<string> {
  const hfImg = await callHFImage(
    `${prompt} bedroom for a video game character, cartoon style, vibrant colors, cozy, detailed, colorful lighting`,
    true
  );
  return hfImg ? `url('${hfImg}') center/cover no-repeat` : getGradient(prompt);
}

export async function generateGameScenario(theme: string): Promise<string> {
  const prompts: Record<string, string> = {
    "Espacio": "outer space game level, stars, nebula, floating platforms, vibrant cartoon style, colorful",
    "Jungla": "tropical jungle game level, lush greenery, waterfalls, cartoon style, vibrant colors",
    "Dulces": "candy land game level, candy cane platforms, lollipops, cotton candy clouds, cartoon style",
    "Hielo": "ice and snow game level, frozen lake, icicles, aurora borealis, cartoon style",
  };
  const hfImg = await callHFImage(
    prompts[theme] || `${theme} game level, cartoon style, vibrant colors, detailed background`,
    true
  );
  return hfImg ? `url('${hfImg}') center/cover no-repeat` : getGradient(theme);
}

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
