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

const socketPath = import.meta.env.VITE_APP_IS_LOCAL ? "http://localhost:8080" : "";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketPath)

socket.on("connect", () => {
  console.log("connected to server")
})

export default socket
