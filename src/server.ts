import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { SocketHandler } from "./socket-handler";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const socketHandler = new SocketHandler(io);
const storage = socketHandler.getStorage();

io.on("connection", (socket) => {
  socketHandler.setupSocketHandlers(socket);
});

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.post("/api/users/names", (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds must be an array" });
    }

    const names: Record<string, string> = {};
    userIds.forEach((userId) => {
      const name = storage.getDisplayName(userId);
      if (name) {
        names[userId] = name;
      }
    });

    res.json(names);
  } catch (error) {
    console.error("Error getting user names:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
