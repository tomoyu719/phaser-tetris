import {
  TetrominoType,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  SPAWN_X,
  SPAWN_Y,
} from '../constants';

export class Tetromino {
  private type: TetrominoType;
  private x: number;
  private y: number;
  private rotationState: number;
  private lastRotationDirection: 'left' | 'right' | null;

  constructor(type: TetrominoType) {
    this.type = type;
    this.x = SPAWN_X;
    this.y = SPAWN_Y;
    this.rotationState = 0;
    this.lastRotationDirection = null;
  }

  moveLeft(): void {
    this.x -= 1;
  }

  moveRight(): void {
    this.x += 1;
  }

  moveDown(): void {
    this.y += 1;
  }

  moveUp(): void {
    this.y -= 1;
  }

  rotateRight(): void {
    this.rotationState = (this.rotationState + 1) % 4;
    this.lastRotationDirection = 'right';
  }

  rotateLeft(): void {
    this.rotationState = (this.rotationState + 3) % 4; // +3 is same as -1 mod 4
    this.lastRotationDirection = 'left';
  }

  undoRotate(): void {
    if (this.lastRotationDirection === 'right') {
      this.rotationState = (this.rotationState + 3) % 4;
    } else if (this.lastRotationDirection === 'left') {
      this.rotationState = (this.rotationState + 1) % 4;
    }
    this.lastRotationDirection = null;
  }

  getShape(): number[][] {
    return TETROMINO_SHAPES[this.type][this.rotationState];
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  getColor(): number {
    return TETROMINO_COLORS[this.type];
  }

  getType(): TetrominoType {
    return this.type;
  }
}
