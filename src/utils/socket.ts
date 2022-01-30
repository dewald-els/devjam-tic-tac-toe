import { io, Socket } from "socket.io-client"

interface Room {
  id: string;
  players: string[]
}

interface ServerToClientEvents {
  noArg: () => void
  basicEmit: (a: number, b: string, c: Buffer) => void
  withAck: (d: string, callback: (e: number) => void) => void
  updatePlayed: (data: any) => void,
  createRoomSuccess: (room: Room) => void,
  joinRoomSuccess: (room: Room) => void
}

interface ClientToServerEvents {
  played: (data: any) => void,
  createRoom: () => void,
  joinRoom: (roomId: string) => void,
  playAgain: (roomId: string) => void
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io()

socket.on("connect", () => {
  console.log("connected to server")
})

export default socket
