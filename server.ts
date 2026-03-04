// AI API routes - all AI calls happen server-side so keys are runtime env vars
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

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

  // --- AI Proxy Routes (server-side, keys are runtime env vars) ---
  app.post("/api/generate-text", async (req, res) => {
    const { systemPrompt, userPrompt, model = "llama3-8b-8192", maxTokens = 200 } = req.body;
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
