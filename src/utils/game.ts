export function checkForWinner(grid: Array<string[]>): string | null {
  let winner: null | string = null

  const row1 = grid[0].filter(Boolean)
  const row2 = grid[1].filter(Boolean)
  const row3 = grid[2].filter(Boolean)

  const col1 = [grid[0][0], grid[1][0], grid[2][0]].filter(Boolean)
  const col2 = [grid[0][1], grid[1][1], grid[2][1]].filter(Boolean)
  const col3 = [grid[0][2], grid[1][2], grid[2][2]].filter(Boolean)

  const diagLR = [grid[0][0], grid[1][1], grid[2][2]].filter(Boolean)
  const diagRL = [grid[0][2], grid[1][1], grid[2][0]].filter(Boolean)

  // HORIZONTAL
  if (
    row1.length === 3 &&
    grid[0][0] == grid[0][1] &&
    grid[0][1] == grid[0][2]
  ) {
    winner = grid[0][0]
  }

  if (
    row2.length === 3 &&
    grid[1][0] == grid[1][1] &&
    grid[1][1] == grid[1][2]
  ) {
    winner = grid[1][0]
  }

  if (
    row3.length === 3 &&
    grid[2][0] == grid[2][1] &&
    grid[2][1] == grid[2][2]
  ) {
    winner = grid[2][0]
  }

  // VERTICAL
  if (
    col1.length === 3 &&
    grid[0][0] == grid[1][0] &&
    grid[1][0] == grid[2][0]
  ) {
    winner = grid[0][0]
  }

  if (
    col2.length === 3 &&
    grid[0][1] == grid[1][1] &&
    grid[1][1] == grid[2][1]
  ) {
    winner = grid[0][1]
  }

  if (
    col3.length === 3 &&
    grid[0][2] == grid[1][2] &&
    grid[1][2] == grid[2][2]
  ) {
    winner = grid[0][2]
  }

  // DIAGONAL
  if (
    diagLR.length === 3 &&
    grid[0][0] == grid[1][1] &&
    grid[1][1] == grid[2][2]
  ) {
    winner = grid[0][0]
  }

  if (
    diagRL.length === 3 &&
    grid[0][2] == grid[1][1] &&
    grid[1][1] == grid[2][0]
  ) {
    winner = grid[0][2]
  }

  return winner
}

export function checkForDraw(
  movesPlayed: number,
  winner: null | string,
  maxMoves: number
): boolean {

  console.log(movesPlayed, maxMoves, winner);
  
  if (movesPlayed === maxMoves && winner === null) {
    return true
  }

  return false
}

export function setEmptyGrid(): Array<string[]> {
  return [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]
}
