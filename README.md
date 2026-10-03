# Tic Tac Toe

Multiplayer tic tac toe: Vue 3 + Vite + Tailwind client, Bun + Express + Socket.IO server.

```sh
bun install
bun run dev:server   # game server on :8080
bun run dev          # client on :5173 (talks to localhost:8080)
bun test             # engine + server integration tests
bun run build && bun start   # production: server also serves dist/
```

- The server is authoritative: it validates turns and moves and owns the game state (`server/index.ts`).
- Game rules live in `src/utils/game.ts` and are shared by the client (local play) and server.
- Set `VITE_SOCKET_URL` to point the client at a different socket server; `CORS_ORIGIN` restricts the server.
