// aiService.ts - Using DiceBear for reliable svg avatars + Groq for text
// No external image API keys needed, no bot protection issues

// DiceBear styles: adventurer, bottts, fun-emoji, lorelei, micah, etc.
const BUDDY_STYLES = ["fun-emoji", "bottts", "adventurer", "micah", "lorelei-neutral"];

function getBuddyStyle(prompt: string): string {
  // Pick a consistent style based on prompt hash
  const hash = prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return BUDDY_STYLES[hash % BUDDY_STYLES.length];
}

export function generateBuddyImage(prompt: string): string {
  const seed = encodeURIComponent(prompt.slice(0, 20));
  const style = getBuddyStyle(prompt);
  // DiceBear returns perfectly reliable SVGs - no API key, no bot protection
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=256&backgroundColor=transparent`;
}

// Room backgrounds are vivid CSS gradient strings (no image API needed)
const ROOM_BACKGROUNDS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
];

export function generateEnvironmentImage(prompt: string): string {
  const hash = prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ROOM_BACKGROUNDS[hash % ROOM_BACKGROUNDS.length];
}

export function generateGameScenario(theme: string): string {
  const hash = theme.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ROOM_BACKGROUNDS[hash % ROOM_BACKGROUNDS.length];
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
