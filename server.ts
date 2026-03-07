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
