import { InjectionKey } from "vue"
import { createStore, Store, useStore as useBaseStore } from "vuex"
import { checkForDraw, checkForWinner, setEmptyGrid } from "./utils/game"

export interface State {
  // Socket
  roomId: string;
  isLocalGame: boolean;
  // Game
  player: string;
  gameStarted: boolean;
  winner: string | null;
movesPlayed: number;
  currentPlayer: string;
  grid: string[][];
  isDraw: boolean;
}

export const MAX_MOVES = 9;

export const key: InjectionKey<Store<State>> = Symbol();

export default createStore<State>({
  state: {
    player: "X",
    gameStarted: false,
    roomId: "",
    isLocalGame: true,
    winner: null,
    movesPlayed: 0,
    currentPlayer: "X",
    grid: setEmptyGrid(),
    isDraw: false,
  },
  mutations: {
    setPlayer: (state: State, player) => {
      state.player = player
    },
    setGameStarted: (state: State, started: boolean) => {
      state.gameStarted = started;
    },
    setRoomId: (state: State, roomId) => {
      state.roomId = roomId
    },
    setIsLocalGame: (state: State, isLocal: boolean) => {
      state.isLocalGame = isLocal
    },
    setWinner: (state: State) => {
      state.winner = checkForWinner(state.grid)
    },
    setIsDraw: (state: State) => {
      state.isDraw = checkForDraw(state.movesPlayed, state.winner, MAX_MOVES)
    },
    incrementMovesPlayed: (state: State) => {
      state.movesPlayed += 1
    },
    changePlayer: (state: State) => {
      state.currentPlayer = state.currentPlayer == "X" ? "O" : "X"
    },
    setGridCell: (state: State, { x, y, player }) => {
      state.grid[x][y] = player
    },
    resetGame: (state: State) => {
      state.player = "X";
      state.currentPlayer = "X"
      state.movesPlayed = 0
      state.winner = null
      state.grid = setEmptyGrid()
      state.roomId = "";
      state.gameStarted = false;
      state.isLocalGame = false;
      state.isDraw = false;
    },
    restartGame: (state: State) => {
      state.movesPlayed = 0;
      state.winner = null;
      state.grid = setEmptyGrid();
      state.gameStarted = true;
      state.isDraw = false;
      state.currentPlayer = "X";
    }
  },
})

export const useStore = () => {
  return useBaseStore(key)
}
