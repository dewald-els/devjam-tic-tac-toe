const express = require("express");
const app = express();
const http = require("http");
const { nanoid } = require("nanoid");
const server = http.createServer(app);
const { join } = require("path");
const { Server } = require("socket.io");
const io = new Server(server, {
  transports: ["websocket"],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const { PORT = 8080 } = process.env;
const cors = require("cors");

app.use(cors());
app.use(express.static(join(__dirname, "dist")));

const MAX_ROOMS = 50;
const rooms = [];

const roomById = (roomId) => rooms.find((room) => room.id === roomId);
const roomIndexById = (roomId) =>
  rooms.findIndex((room) => room.id === roomById(roomId));

app.get("/", (req, res) => {
  return res.status(200).sendFile(join(__dirname, "dist", "index.html"));
});

io.on("connection", (socket) => {
  console.log("connected");

  socket.on("createRoom", () => {
    console.log("creating a new room");
    if (rooms.length + 1 > MAX_ROOMS) {
      console.log("Maximum room numbers reached: 50/50");
      socket.emit(
        "createRoomError",
        "Rooms are currently full (50/50). Please try again later."
      );
      return;
    }

    const newRoomId = nanoid();
    const initialPlayer = "X";

    rooms.push({
      id: newRoomId,
      players: [initialPlayer],
    });
    console.log("Room Created", rooms);
    socket.emit("createRoomSuccess", rooms[rooms.length - 1]);
  });

  socket.on("joinRoom", (roomId) => {
    console.log("Player has joined room " + roomId);

    const room = roomById(roomId);
    if (!room) {
      console.log("Room " + roomId + " does not exist.");
      socket.emit("joinRoomError", "Room does not exist");
    }

    if (room.players.length === 2) {
      console.log("RoomId " + roomId + " is already full with 2 players");
      socket.emit("joinRoomError", "Room is already full");
    }

    room.players.push("O");

    socket.emit("joinRoomSuccess", { ...room });
    socket.broadcast.emit("playerTwoJoined", { ...room });
  });

  socket.on("played", (data) => {
    console.log("played", data);
    socket.broadcast.emit("updatePlayed", data);
  });

  socket.on("leaveRoom", ({ roomId, player }) => {
    console.log("Someone leaving room: ", roomId, player);
    const index = roomIndexById(roomId);
    rooms.splice(index, 1);
    socket.broadcast.emit("opponentLeftRoom", {
      player,
      roomId,
    });
  });
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server started on port ${PORT}`)
);
