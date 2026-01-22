import { SCORE_TABLE, LOCK_DELAY, ALL_TETROMINO_TYPES, TetrominoType } from '../constants';

export interface GameLogicOptions {
  rng?: () => number;
}

export class GameLogic {
  private score: number;
  private landed: boolean;
  private lockCounter: number;
  private rng: () => number;
  private nextType: TetrominoType;

  constructor(options?: GameLogicOptions) {
    this.score = 0;
    this.landed = false;
    this.lockCounter = 0;
    this.rng = options?.rng ?? Math.random;
    this.nextType = this.generateRandomType(); // 即時初期化で呼び出し順序に依存しない
  }

  calculateScore(linesCleared: number): number {
    if (linesCleared <= 0) {
      return 0;
    }
    return SCORE_TABLE[linesCleared] ?? 0;
  }

  addScore(linesCleared: number): void {
    this.score += this.calculateScore(linesCleared);
  }

  getScore(): number {
    return this.score;
  }

  onLanded(): void {
    this.landed = true;
  }

  onFloated(): void {
    this.landed = false;
    this.lockCounter = 0;
  }

  isLanded(): boolean {
    return this.landed;
  }

  updateLockDelay(): boolean {
    if (!this.landed) {
      return false;
    }
    this.lockCounter++;
    return this.lockCounter >= LOCK_DELAY;
  }

  resetLockState(): void {
    this.landed = false;
    this.lockCounter = 0;
  }

  getNextTetrominoType(): TetrominoType {
    const type = this.nextType;
    this.nextType = this.generateRandomType();
    return type;
  }

  peekNextTetrominoType(): TetrominoType {
    return this.nextType;
  }

  private generateRandomType(): TetrominoType {
    const index = Math.floor(this.rng() * ALL_TETROMINO_TYPES.length);
    return ALL_TETROMINO_TYPES[index];
  }
}
