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

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://localhost:5000")

socket.on("connect", () => {
  console.log("connected to server")
})

export default socket
