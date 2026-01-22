import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';
import { Tetromino } from './Tetromino';

export class Board {
  private grid: number[][];

  constructor() {
    this.grid = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < BOARD_WIDTH; x++) {
        this.grid[y][x] = 0;
      }
    }
  }

  checkCollision(tetromino: Tetromino, offsetX: number, offsetY: number): boolean {
    const shape = tetromino.getShape();
    const pos = tetromino.getPosition();
    const newX = pos.x + offsetX;
    const newY = pos.y + offsetY;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const boardX = newX + col;
          const boardY = newY + row;

          // Check wall collision (left and right)
          if (boardX < 0 || boardX >= BOARD_WIDTH) {
            return true;
          }

          // Check floor collision
          if (boardY >= BOARD_HEIGHT) {
            return true;
          }

          // Check ceiling (negative Y is allowed for spawn)
          if (boardY < 0) {
            continue;
          }

          // Check collision with existing blocks
          if (this.grid[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }

    return false;
  }

  lockTetromino(tetromino: Tetromino): void {
    const shape = tetromino.getShape();
    const pos = tetromino.getPosition();
    const color = tetromino.getColor();

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const boardX = pos.x + col;
          const boardY = pos.y + row;

          // Only lock if within board bounds
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            this.grid[boardY][boardX] = color;
          }
        }
      }
    }
  }

  clearLines(): number {
    let linesCleared = 0;

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.isLineFull(y)) {
        this.removeLine(y);
        linesCleared++;
        y++; // Check the same row again (lines above have dropped)
      }
    }

    return linesCleared;
  }

  private isLineFull(y: number): boolean {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (this.grid[y][x] === 0) {
        return false;
      }
    }
    return true;
  }

  private removeLine(y: number): void {
    // Remove the line and drop everything above
    for (let row = y; row > 0; row--) {
      this.grid[row] = [...this.grid[row - 1]];
    }
    // Clear the top line
    this.grid[0] = new Array(BOARD_WIDTH).fill(0);
  }

  isGameOver(tetromino: Tetromino): boolean {
    // Game is over if the tetromino collides at spawn position
    return this.checkCollision(tetromino, 0, 0);
  }

  getGrid(): number[][] {
    return this.grid;
  }
}
