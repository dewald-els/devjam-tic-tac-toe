import { InjectionKey } from "vue"
import { createStore, Store, useStore as useBaseStore } from "vuex"
import { checkForDraw, checkForWinner, setEmptyGrid } from "./utils/game"

export interface State {
  // Socket
  roomId: string
  isLocalGame: boolean
  onlinePlayer: string
  // Game
  winner: string | null
  movesPlayed: number
  currentPlayer: string
  grid: string[][]
  isDraw: boolean
}

export const MAX_MOVES = 9

export const key: InjectionKey<Store<State>> = Symbol()

export default createStore<State>({
  state: {
    roomId: "",
    onlinePlayer: "",
    isLocalGame: true,
    winner: null,
    movesPlayed: 0,
    currentPlayer: "X",
    grid: setEmptyGrid(),
    isDraw: false,
  },
  mutations: {
    setOnlinePlayer: (state: State, player) => {
      state.onlinePlayer = player
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
      state.currentPlayer = "X"
      state.movesPlayed = 0
      state.winner = null
      state.grid = setEmptyGrid()
    },
  },
})

export const useStore = () => {
  return useBaseStore(key)
}
