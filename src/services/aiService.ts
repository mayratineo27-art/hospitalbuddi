// aiService.ts
// Buddy: custom Goku SVG (default) + DiceBear per style
// Backgrounds: Hugging Face FLUX.1-schnell (real AI) with CSS gradient fallbacks
// Text: Groq via /api/generate-text proxy

// ── Goku default SVG ──
const GOKU_SVG = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <path d="M20 85 Q14 130 22 155 L98 155 Q106 130 100 85 L85 75 Q70 92 60 92 Q50 92 35 75 Z" fill="#FF8C00"/>
  <path d="M45 75 Q52 82 60 82 Q68 82 75 75 L70 72 Q60 78 50 72 Z" fill="#1565C0"/>
  <rect x="28" y="100" width="64" height="10" rx="3" fill="#1565C0"/>
  <rect x="54" y="97" width="12" height="16" rx="2" fill="#1565C0"/>
  <path d="M54 113 L48 155 L54 155 Z" fill="#1565C0"/>
  <path d="M66 113 L72 155 L66 155 Z" fill="#1565C0"/>
  <rect x="52" y="62" width="16" height="14" fill="#FDBCB4"/>
  <ellipse cx="60" cy="48" rx="28" ry="26" fill="#FDBCB4"/>
  <path d="M33 44 Q34 18 60 15 Q86 18 87 44 Q78 28 60 27 Q42 28 33 44Z" fill="#1a1a1a"/>
  <polygon points="35,40 28,8 42,32" fill="#1a1a1a"/>
  <polygon points="48,30 46,4 56,26" fill="#1a1a1a"/>
  <polygon points="60,27 60,2 66,24" fill="#1a1a1a"/>
  <polygon points="72,30 78,6 68,28" fill="#1a1a1a"/>
  <polygon points="84,40 92,10 78,34" fill="#1a1a1a"/>
  <ellipse cx="32" cy="50" rx="5" ry="7" fill="#FDBCB4"/>
  <ellipse cx="88" cy="50" rx="5" ry="7" fill="#FDBCB4"/>
  <ellipse cx="48" cy="50" rx="7" ry="6" fill="white"/>
  <ellipse cx="72" cy="50" rx="7" ry="6" fill="white"/>
  <ellipse cx="49" cy="51" rx="4" ry="4" fill="#2C1810"/>
  <ellipse cx="73" cy="51" rx="4" ry="4" fill="#2C1810"/>
  <ellipse cx="50" cy="51" rx="2" ry="2" fill="#000"/>
  <ellipse cx="74" cy="51" rx="2" ry="2" fill="#000"/>
  <circle cx="51" cy="49" r="1" fill="white"/>
  <circle cx="75" cy="49" r="1" fill="white"/>
  <path d="M41 42 L58 40" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M62 40 L79 42" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="60" cy="57" rx="3" ry="2" fill="#e8a090"/>
  <path d="M49 65 Q60 74 71 65" stroke="#cc5555" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="60" r="4" fill="#FFB3B3" opacity="0.75"/>
  <circle cx="80" cy="60" r="4" fill="#FFB3B3" opacity="0.75"/>
  <circle cx="60" cy="118" r="10" fill="#FF6B00" stroke="#FF8C00" stroke-width="1"/>
  <text x="60" y="122" text-anchor="middle" font-size="11" fill="white" font-family="serif" font-weight="bold">&#x4E80;</text>
</svg>`);

export function generateBuddyImage(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("superhero") || p.includes("héroe") || p.includes("hero"))
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=superhero&backgroundColor=b6e3f4&hairColor=6d4c41`;
  if (p.includes("astronaut") || p.includes("astronauta") || p.includes("space suit"))
    return `https://api.dicebear.com/9.x/bottts/svg?seed=astronaut&backgroundColor=b6e3f4`;
  if (p.includes("pirate") || p.includes("pirata"))
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=pirate&backgroundColor=transparent&hairColor=2c1810`;
  if (p.includes("wizard") || p.includes("mago") || p.includes("magic"))
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=wizard&backgroundColor=transparent&hairColor=4a0080`;
  if (p.includes("robot") || p.includes("cybernetic"))
    return `https://api.dicebear.com/9.x/bottts/svg?seed=robot&backgroundColor=b6e3f4`;
  return `data:image/svg+xml;charset=utf-8,${GOKU_SVG}`;
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

// In-memory cache for HF images (so same prompt isn't re-generated)
const imageCache: Record<string, string> = {};

async function callHFImage(prompt: string): Promise<string | null> {
  if (imageCache[prompt]) return imageCache[prompt];
  try {
    const res = await fetch("/api/hf-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const { image } = await res.json();
    if (image) imageCache[prompt] = image;
    return image || null;
  } catch {
    return null;
  }
}

export async function generateEnvironmentImage(prompt: string): Promise<string> {
  const hfImg = await callHFImage(
    `${prompt} bedroom for a video game character, cartoon style, vibrant colors, cozy, detailed, colorful lighting`
  );
  return hfImg || getGradient(prompt);
}

export async function generateGameScenario(theme: string): Promise<string> {
  const prompts: Record<string, string> = {
    "Espacio": "outer space game level, stars, nebula, floating platforms, vibrant cartoon style, colorful",
    "Jungla": "tropical jungle game level, lush greenery, waterfalls, cartoon style, vibrant colors",
    "Dulces": "candy land game level, candy cane platforms, lollipops, cotton candy clouds, cartoon style",
    "Hielo": "ice and snow game level, frozen lake, icicles, aurora borealis, cartoon style",
  };
  const hfImg = await callHFImage(
    prompts[theme] || `${theme} game level, cartoon style, vibrant colors, detailed background`
  );
  return hfImg || getGradient(theme);
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
