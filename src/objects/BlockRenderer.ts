import Phaser from 'phaser';
import { CELL_SIZE, BOARD_WIDTH, BOARD_HEIGHT } from '../constants';
import { Tetromino } from './Tetromino';
import { Board } from './Board';

export class BlockRenderer {
  drawBlock(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const pixelX = x * CELL_SIZE;
    const pixelY = y * CELL_SIZE;

    // Fill block
    graphics.fillStyle(color, 1);
    graphics.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);

    // Draw border (darker shade)
    graphics.lineStyle(1, this.darkenColor(color), 1);
    graphics.strokeRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);

    // Add highlight effect (top-left lighter)
    graphics.lineStyle(2, this.lightenColor(color), 0.5);
    graphics.beginPath();
    graphics.moveTo(pixelX + 1, pixelY + CELL_SIZE - 1);
    graphics.lineTo(pixelX + 1, pixelY + 1);
    graphics.lineTo(pixelX + CELL_SIZE - 1, pixelY + 1);
    graphics.strokePath();
  }

  drawTetromino(
    graphics: Phaser.GameObjects.Graphics,
    tetromino: Tetromino
  ): void {
    const shape = tetromino.getShape();
    const pos = tetromino.getPosition();
    const color = tetromino.getColor();

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const x = pos.x + col;
          const y = pos.y + row;
          // Only draw if within visible board area
          if (y >= 0) {
            this.drawBlock(graphics, x, y, color);
          }
        }
      }
    }
  }

  drawBoard(graphics: Phaser.GameObjects.Graphics, board: Board): void {
    const grid = board.getGrid();

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const color = grid[y][x];
        if (color !== 0) {
          this.drawBlock(graphics, x, y, color);
        }
      }
    }
  }

  drawGrid(graphics: Phaser.GameObjects.Graphics): void {
    graphics.lineStyle(1, 0x333333, 0.5);

    // Vertical lines
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      graphics.beginPath();
      graphics.moveTo(x * CELL_SIZE, 0);
      graphics.lineTo(x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
      graphics.strokePath();
    }

    // Horizontal lines
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      graphics.beginPath();
      graphics.moveTo(0, y * CELL_SIZE);
      graphics.lineTo(BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
      graphics.strokePath();
    }
  }

  clear(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) - 40);
    const g = Math.max(0, ((color >> 8) & 0xff) - 40);
    const b = Math.max(0, (color & 0xff) - 40);
    return (r << 16) | (g << 8) | b;
  }

  private lightenColor(color: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + 40);
    const g = Math.min(255, ((color >> 8) & 0xff) + 40);
    const b = Math.min(255, (color & 0xff) + 40);
    return (r << 16) | (g << 8) | b;
  }
}
