// aiService.ts - Images via Pollinations.ai (free, no API key!)
// Text via Groq through our backend proxy (/api/generate-text)

const cache: Record<string, string> = {};

function getCached(key: string): string | null {
  if (cache[key]) return cache[key];
  const stored = localStorage.getItem(`v3_cache_${key}`);
  if (stored) { cache[key] = stored; return stored; }
  return null;
}

function setCached(key: string, value: string) {
  cache[key] = value;
  try { localStorage.setItem(`v3_cache_${key}`, value); } catch (_) { }
}

function pollinationsUrl(prompt: string, width = 512, height = 512): string {
  const seed = Math.floor(Math.random() * 999999);
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
}

async function removeWhiteBackground(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) imageData.data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
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

export async function generateBuddyImage(prompt: string) {
  const key = `buddy_${prompt}`;
  const cached = getCached(key);
  if (cached) return cached;

  const url = pollinationsUrl(
    `3D character design, Stumble Guys style, ${prompt}, vibrant colors, rounded blocky shapes, expressive face, game asset, full body character, white isolated background, high quality cartoon`,
    512, 512
  );
  // Return URL directly - can't process cross-origin images in canvas (CORS)
  setCached(key, url);
  return url;
}

export async function generateGameScenario(theme: string) {
  const key = `scenario_${theme}`;
  const cached = getCached(key);
  if (cached) return cached;

  const url = pollinationsUrl(
    `3D video game level design, ${theme} theme, Stumble Guys aesthetic, colorful obstacles, floating platforms, vibrant sky, fun atmosphere, wide landscape, isometric view`,
    1024, 576
  );
  setCached(key, url);
  return url;
}

export async function generateEnvironmentImage(prompt: string) {
  const key = `env_${prompt}`;
  const cached = getCached(key);
  if (cached) return cached;

  const url = pollinationsUrl(
    `3D cartoon style game environment, ${prompt}, soft lighting, warm colors, cozy atmosphere, high detail, game background`,
    1024, 576
  );
  setCached(key, url);
  return url;
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
