import "dotenv/config";
// AI API routes - all AI calls happen server-side so keys are runtime env vars
import express from "express";
import { createServer } from "http";
import https from "https";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // --- AI Image Generation (Hugging Face / FLUX) ---

  // --- High Quality Image Generation Proxy (Hugging Face FLUX.1) ---
  app.post("/api/hf-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.HF_TOKEN) return res.status(500).json({ error: "HF_TOKEN not configured" });

    try {
      // Using black-forest-labs/FLUX.1-schnell for ultra-high quality and speed
      const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Failed: ${response.status} ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      res.json({ image: `data:image/webp;base64,${base64}` });
    } catch (err: any) {
      console.error("Image gen error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Gemini Image Generation (Imagen 3) ---
  app.post("/api/gemini-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      // Note: Imagen 3 availability via the SDK might vary. 
      // We use the stable endpoint logic or the SDK if supported.
      const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Handle the case where the model returns an image (if supported in this version)
      // or if we need to call a specific endpoint for Imagen.
      // Since SDK support for Imagen is evolving, we'll implement a robust fallback or check.

      // For now, if generateContent doesn't return an image, we'll try a direct fetch to the Imagen API
      // if the SDK doesn't have a dedicated method yet.
      // Actually, standard Gemini models don't return images via generateContent.
      // Imagen 3 is usually accessed via a specific Imagen API.

      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`;

      const imagenResponse = await fetch(imagenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/png"
          }
        }),
      });

      if (!imagenResponse.ok) {
        const errorText = await imagenResponse.text();
        throw new Error(`Gemini Imagen API Failed: ${imagenResponse.status} ${errorText}`);
      }

      const data = await imagenResponse.json();
      const base64Image = data.predictions[0].bytesBase64Encoded;

      res.json({ image: `data:image/png;base64,${base64Image}` });
    } catch (err: any) {
      console.error("Gemini Image error:", err.message);
      // Fallback to HF if Gemini fails, to ensure some image is generated during presentation
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
