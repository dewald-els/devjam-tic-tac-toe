import { io, Socket } from "socket.io-client"

interface Room {
  id: string;
  players: string[]
}

interface LeaveRoomData {
  roomId: string;
  player: string;
}

interface ServerToClientEvents {
  noArg: () => void
  basicEmit: (a: number, b: string, c: Buffer) => void
  withAck: (d: string, callback: (e: number) => void) => void
  updatePlayed: (data: any) => void,
  createRoomSuccess: (room: Room) => void,
  joinRoomSuccess: (room: Room) => void,
  opponentLeftRoom: (player: string) => void,
  closeRoom: () => void
}

interface ClientToServerEvents {
  played: (data: any) => void,
  createRoom: () => void,
  joinRoom: (roomId: string) => void,
  playAgain: (roomId: string) => void,
  leaveRoom: (data: LeaveRoomData) => void
}


const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://127.0.0.1:8080", {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  transports: ['websocket']
})

socket.on("connect", () => {
  console.log("connected to server")
});

socket.on("connect_error", (error) => {
  console.log("Could not connect to socket server.");
});

export default socket
