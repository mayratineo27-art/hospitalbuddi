import "dotenv/config";
// AI API routes - all AI calls happen server-side so keys are runtime env vars
import express from "express";
import { createServer } from "http";
import https from "https";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Parse JSON bodies for API routes
  app.use(express.json());

  // --- Health Check for Render ---
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  console.log("Setting up AI routes...");

  // --- AI Image Generation (Hugging Face / FLUX) ---

  // --- High Quality Image Generation Proxy (Hugging Face FLUX.1) ---
  app.post("/api/hf-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.HF_TOKEN) return res.status(500).json({ error: "HF_TOKEN not configured" });

    const models = [
      "black-forest-labs/FLUX.1-schnell",
      "stabilityai/stable-diffusion-xl-base-1.0",
      "runwayml/stable-diffusion-v1-5",
      "prompthero/openjourney"
    ];

    for (const model of models) {
      try {
        console.log(`Trying HF model: ${model}`);
        const response = await fetch(
          `https://router.huggingface.co/models/${model}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.HF_TOKEN}`,
              "Content-Type": "application/json",
              "x-use-cache": "false",
              "x-wait-for-model": "true"
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await response.json();
            if (json.error) {
              console.warn(`HF model ${model} returned error but 200 OK:`, json.error);
              continue;
            }
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          // Safely return as PNG which is supported by almost all models
          return res.json({ image: `data:image/png;base64,${base64}` });
        } else {
          const errorText = await response.text();
          console.warn(`HF model ${model} failed with ${response.status}: ${errorText}`);
        }
      } catch (err: any) {
        console.error(`Error with model ${model}:`, err.message);
      }
    }

    res.status(500).json({ error: "All HF models failed" });
  });

  // --- Gemini Image Generation (Imagen 3) ---
  app.post("/api/gemini-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    try {
      // Direct call to the Imagen 3 predict endpoint
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`;

      const imagenResponse = await fetch(imagenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/png" }
        }),
      });

      if (!imagenResponse.ok) {
        const errorText = await imagenResponse.text();
        throw new Error(`Gemini Imagen API Failed: ${imagenResponse.status} ${errorText}`);
      }

      const data = await imagenResponse.json();
      if (!data.predictions || !data.predictions[0] || !data.predictions[0].bytesBase64Encoded) {
        throw new Error("Invalid response from Gemini Imagen API. Check if your API Key has Imagen 3 access.");
      }

      res.json({ image: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}` });
    } catch (err: any) {
      console.error("Gemini Image error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Text Generation Proxy (Groq) ---
  app.post("/api/generate-text", async (req, res) => {
    const { systemPrompt, userPrompt, model = "llama-3.1-8b-instant", maxTokens = 200 } = req.body;
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    try {
      const { Groq } = await import("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      res.json({ text: completion.choices[0]?.message?.content || "" });
    } catch (err: any) {
      console.error("Groq error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Game State: Room -> Players object ---
  const rooms: Record<string, Record<string, { x: number, y: number, color: string, id: string }>> = {};

  io.on("connection", (socket) => {
    const room = (socket.handshake.query.room as string) || "global";
    socket.join(room);
    console.log(`User ${socket.id} connected to room: ${room}`);

    if (!rooms[room]) rooms[room] = {};

    rooms[room][socket.id] = {
      id: socket.id,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };

    socket.emit("init", rooms[room]);
    socket.to(room).emit("playerJoined", rooms[room][socket.id]);

    socket.on("move", (pos: { x: number, y: number }) => {
      if (rooms[room] && rooms[room][socket.id]) {
        rooms[room][socket.id].x = pos.x;
        rooms[room][socket.id].y = pos.y;
        socket.to(room).emit("playerMoved", rooms[room][socket.id]);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected from room: ${room}`);
      if (rooms[room]) {
        delete rooms[room][socket.id];
        if (Object.keys(rooms[room]).length === 0) {
          delete rooms[room];
        } else {
          io.to(room).emit("playerLeft", socket.id);
        }
      }
    });
  });

  // --- OpenAI API Routes ---
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  app.post("/api/openai-text", async (req, res) => {
    const { systemPrompt, userPrompt, model = "gpt-4o", maxTokens = 500 } = req.body;
    if (!openai) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model,
        max_tokens: maxTokens,
      });
      res.json({ text: completion.choices[0]?.message?.content || "" });
    } catch (err: any) {
      console.error("OpenAI Text error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/openai-image", async (req, res) => {
    const { prompt } = req.body;
    if (!openai) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      });
      res.json({ image: `data:image/png;base64,${response.data[0].b64_json}` });
    } catch (err: any) {
      console.error("OpenAI Image error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("Configuring static files...");
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server definitively running on http://0.0.0.0:${PORT}`);
    console.log(`>>> Health check available at http://0.0.0.0:${PORT}/health`);
  });
}

console.log("Starting HospitalBuddy Server initialization...");
startServer().catch(err => {
  console.error("FATAL: Server failed to start:", err);
  process.exit(1);
});
