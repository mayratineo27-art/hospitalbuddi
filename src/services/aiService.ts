// aiService.ts - Using DiceBear for reliable svg avatars + Groq for text
// No external image API keys needed, no bot protection issues

// DiceBear styles: adventurer, bottts, fun-emoji, lorelei, micah, etc.
const BUDDY_STYLES = ["fun-emoji", "bottts", "adventurer", "micah", "lorelei-neutral"];

function getBuddyStyle(prompt: string): string {
  // Pick a consistent style based on prompt hash
  const hash = prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return BUDDY_STYLES[hash % BUDDY_STYLES.length];
}

// Goku-inspired avatar: DiceBear 'adventurer' with spiky hair look
export function generateBuddyImage(_prompt: string): string {
  // Using 'adventurer' style with specific seed + orange/gold colors to evoke Goku
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=Goku&hair=short01&hairColor=f5a623,f0c040&skinColor=f5c5a0&backgroundColor=transparent&size=256`;
}

// Unique themed gradient for each game world
const THEME_BACKGROUNDS: Record<string, string> = {
  "Espacio": "radial-gradient(ellipse at top, #0f0c29, #302b63, #24243e)",
  "Jungla": "linear-gradient(135deg, #1a6b06 0%, #52b812 50%, #1e3a0a 100%)",
  "Dulces": "linear-gradient(135deg, #ff9ff3 0%, #ffeaa7 50%, #fd79a8 100%)",
  "Hielo": "linear-gradient(135deg, #a8edea 0%, #74b9ff 50%, #dfe6f9 100%)",
};

export function generateEnvironmentImage(_prompt: string): string {
  return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
}

export function generateGameScenario(theme: string): string {
  return THEME_BACKGROUNDS[theme] || "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #ffecd2 100%)";
}

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
