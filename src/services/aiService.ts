// aiService.ts - All AI calls go through our backend proxy routes
// This means API keys stay server-side and are real runtime env vars

const cache: Record<string, string> = {};

async function getCachedImage(key: string, generator: () => Promise<string | null>) {
  if (cache[key]) return cache[key];

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
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

async function callImageAPI(prompt: string, aspectRatio = "1:1"): Promise<string | null> {
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data || null;
  } catch (err) {
    console.error("Image API error:", err);
    return null;
  }
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
  return getCachedImage(`buddy_${prompt}`, async () => {
    const base64 = await callImageAPI(
      `3D character design, Stumble Guys style, energetic pose, ${prompt}. Vibrant colors, rounded blocky shapes, expressive face, high-quality rendering, game asset, 4k, fun and friendly. ISOLATED ON SOLID WHITE BACKGROUND, NO SHADOWS.`,
      "1:1"
    );
    return base64 ? removeWhiteBackground(base64) : null;
  });
}

export async function generateGameScenario(theme: string) {
  return getCachedImage(`scenario_${theme}`, async () =>
    callImageAPI(
      `3D video game level design, ${theme} theme, Stumble Guys aesthetic. Colorful obstacles, floating platforms, vibrant sky, high detail, fun atmosphere, 4k, isometric view.`,
      "16:9"
    )
  );
}

export async function generateStoryContent(topic: string) {
  const result = await callTextAPI(
    "Eres un cuentacuentos amigable para niños. Tu objetivo es hacerlos sentir valientes y felices. Escribe siempre en español.",
    `Escribe una historia muy corta, alentadora y mágica para un niño en un hospital sobre ${topic}. Debe estar en ESPAÑOL. Máximo 100 palabras. Usa emojis.`,
    200
  );
  return result || "¡Oh no! Mi libro de cuentos se quedó sin magia. ✨";
}

export async function generateCheerMessage() {
  const result = await callTextAPI(
    "Eres un compañero virtual amigable para niños. Tu objetivo es hacerlos sonreír.",
    "Genera un mensaje de ánimo muy corto (máximo 15 palabras) y divertido para un niño en un hospital. Usa emojis. En ESPAÑOL. NO MANDES TEXTO EXTRA, SOLO EL MENSAJE CORTITO DIRECTAMENTE.",
    50
  );
  return result || "¡Eres un campeón! ✨";
}

export async function generateEnvironmentImage(prompt: string) {
  return getCachedImage(`env_${prompt}`, async () =>
    callImageAPI(
      `3D cartoon style game environment, ${prompt}. Soft lighting, warm colors, cozy atmosphere, high detail, 4k, game background.`,
      "16:9"
    )
  );
}
