import Phaser from 'phaser';
import { Board } from '../objects/Board';
import { Tetromino } from '../objects/Tetromino';
import { GameLogic } from '../objects/GameLogic';
import { BlockRenderer } from '../objects/BlockRenderer';
import {
  BOARD_WIDTH,
  CELL_SIZE,
  DROP_INTERVAL,
  SOFT_DROP_INTERVAL,
} from '../constants';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private currentTetromino!: Tetromino;
  private gameLogic!: GameLogic;
  private blockRenderer!: BlockRenderer;

  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private nextPreviewGraphics!: Phaser.GameObjects.Graphics;

  private dropTimer!: Phaser.Time.TimerEvent;
  private isSoftDropping: boolean = false;
  private isGameOver: boolean = false;

  // ゲームオーバーオーバーレイ用
  private overlayContainer!: Phaser.GameObjects.Container;



  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    document.body.setAttribute('data-scene', 'game');
    this.initGame();
    this.setupInput();
    this.setupUI();
    this.startDropTimer(DROP_INTERVAL);
    this.draw();
  }

  private initGame(): void {
    document.body.setAttribute('data-game-state', 'playing');

    this.board = new Board();
    this.blockRenderer = new BlockRenderer();
    this.isGameOver = false;
    this.isSoftDropping = false;

    // テスト用: URLパラメータでRNGシード指定可能
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    if (seedParam) {
      const seed = parseInt(seedParam, 10);
      this.gameLogic = new GameLogic({ rng: this.seededRandom(seed) });
    } else {
      this.gameLogic = new GameLogic();
    }

    // 描画用Graphics
    this.graphics = this.add.graphics();

    // 次のテトリミノを取得して現在のテトリミノを生成
    this.spawnTetromino();
  }

  // シード付き乱数生成器（E2Eテスト用）
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      return currentSeed / 0x7fffffff;
    };
  }

  private setupUI(): void {
    const fieldWidth = BOARD_WIDTH * CELL_SIZE;
    const uiX = fieldWidth + 20;

    // スコア表示
    this.add.text(uiX, 20, 'SCORE', {
      fontSize: '18px',
      color: '#ffffff',
    });
    this.scoreText = this.add.text(uiX, 45, '0', {
      fontSize: '24px',
      color: '#00ff00',
    });

    // NEXT表示
    this.add.text(uiX, 100, 'NEXT', {
      fontSize: '18px',
      color: '#ffffff',
    });
    this.nextPreviewGraphics = this.add.graphics();
    this.nextPreviewGraphics.setPosition(uiX, 130);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    // 左移動
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.isGameOver) return;
      this.tryMove(() => this.currentTetromino.moveLeft(), () => this.currentTetromino.moveRight());
    });

    // 右移動
    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.isGameOver) return;
      this.tryMove(() => this.currentTetromino.moveRight(), () => this.currentTetromino.moveLeft());
    });

    // ソフトドロップ開始
    this.input.keyboard.on('keydown-DOWN', () => {
      if (this.isGameOver) return;
      if (!this.isSoftDropping) {
        this.isSoftDropping = true;
        this.startDropTimer(SOFT_DROP_INTERVAL);
      }
    });

    // ソフトドロップ終了
    this.input.keyboard.on('keyup-DOWN', () => {
      if (this.isGameOver) return;
      if (this.isSoftDropping) {
        this.isSoftDropping = false;
        this.startDropTimer(DROP_INTERVAL);
      }
    });

    // 左回転（上矢印 or Z）
    this.input.keyboard.on('keydown-UP', () => {
      if (this.isGameOver) return;
      this.tryRotate('left');
    });
    this.input.keyboard.on('keydown-Z', () => {
      if (this.isGameOver) return;
      this.tryRotate('left');
    });

    // 右回転（X）
    this.input.keyboard.on('keydown-X', () => {
      if (this.isGameOver) return;
      this.tryRotate('right');
    });
  }

  private tryMove(move: () => void, undo: () => void): void {
    move();
    if (this.board.checkCollision(this.currentTetromino, 0, 0)) {
      undo();
    } else {
      // 移動で浮いた場合、ロック状態をリセット
      if (!this.board.checkCollision(this.currentTetromino, 0, 1)) {
        this.gameLogic.onFloated();
      }
      this.draw();
    }
  }

  private tryRotate(direction: 'left' | 'right'): void {
    if (direction === 'left') {
      this.currentTetromino.rotateLeft();
    } else {
      this.currentTetromino.rotateRight();
    }

    // 衝突判定
    if (this.board.checkCollision(this.currentTetromino, 0, 0)) {
      // 回転キャンセル
      this.currentTetromino.undoRotate();
    } else {
      // 回転で浮いた場合、ロック状態をリセット
      if (!this.board.checkCollision(this.currentTetromino, 0, 1)) {
        this.gameLogic.onFloated();
      }
      this.draw();
    }
  }

  private startDropTimer(interval: number): void {
    if (this.dropTimer) {
      this.dropTimer.destroy();
    }
    this.dropTimer = this.time.addEvent({
      delay: interval,
      callback: this.onDrop,
      callbackScope: this,
      loop: true,
    });
  }

  private onDrop(): void {
    if (this.isGameOver) return;

    // 下に移動を試みる
    this.currentTetromino.moveDown();

    if (this.board.checkCollision(this.currentTetromino, 0, 0)) {
      // 衝突したら戻す
      this.currentTetromino.moveUp();
      // 着地状態
      this.gameLogic.onLanded(this.time.now);
    } else {
      // 移動成功、浮いている場合はリセット
      if (!this.board.checkCollision(this.currentTetromino, 0, 1)) {
        this.gameLogic.onFloated();
      } else {
        this.gameLogic.onLanded(this.time.now);
      }
    }

    this.draw();
  }

  update(): void {
    if (this.isGameOver) return;

    // ロックディレイ処理
    if (this.gameLogic.updateLockDelay(this.time.now)) {
      this.lockAndSpawn();
    }
  }

  private lockAndSpawn(): void {
    // テトリミノを固定
    this.board.lockTetromino(this.currentTetromino);
    this.gameLogic.resetLockState();

    // ライン消去とスコア加算
    const linesCleared = this.board.clearLines();
    if (linesCleared > 0) {
      this.gameLogic.addScore(linesCleared);
      this.updateScoreDisplay();
    }

    // 次のテトリミノを生成
    this.spawnTetromino();

    // ゲームオーバー判定
    if (this.board.isGameOver(this.currentTetromino)) {
      this.triggerGameOver();
      return;
    }

    this.draw();
  }

  private spawnTetromino(): void {
    const type = this.gameLogic.getNextTetrominoType();
    this.currentTetromino = new Tetromino(type);
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(this.gameLogic.getScore().toString());
  }

  private draw(): void {
    this.graphics.clear();

    // グリッド描画
    this.blockRenderer.drawGrid(this.graphics);

    // ボード描画
    this.blockRenderer.drawBoard(this.graphics, this.board);

    // 現在のテトリミノ描画
    this.blockRenderer.drawTetromino(this.graphics, this.currentTetromino);

    // 次のテトリミノプレビュー
    this.drawNextPreview();
  }

  private drawNextPreview(): void {
    this.nextPreviewGraphics.clear();
    const nextType = this.gameLogic.peekNextTetrominoType();
    const previewTetromino = new Tetromino(nextType);
    const shape = previewTetromino.getShape();
    const color = previewTetromino.getColor();
    const previewCellSize = 20;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const pixelX = col * previewCellSize;
          const pixelY = row * previewCellSize;
          this.nextPreviewGraphics.fillStyle(color, 1);
          this.nextPreviewGraphics.fillRect(pixelX, pixelY, previewCellSize, previewCellSize);
          this.nextPreviewGraphics.lineStyle(1, 0x000000, 1);
          this.nextPreviewGraphics.strokeRect(pixelX, pixelY, previewCellSize, previewCellSize);
        }
      }
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    document.body.setAttribute('data-game-state', 'gameover');
    if (this.dropTimer) {
      this.dropTimer.destroy();
    }
    this.showGameOverOverlay();
  }

  private showGameOverOverlay(): void {
    const { width, height } = this.scale;

    this.overlayContainer = this.add.container(0, 0);

    // 半透明黒背景
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlayContainer.add(overlay);

    // GAME OVER テキスト
    const gameOverText = this.add
      .text(width / 2, height / 3, 'GAME OVER', {
        fontSize: '48px',
        color: '#ff0000',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);
    this.overlayContainer.add(gameOverText);

    // 最終スコア
    const finalScoreText = this.add
      .text(width / 2, height / 2, `SCORE: ${this.gameLogic.getScore()}`, {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);
    this.overlayContainer.add(finalScoreText);

    // リトライ案内
    const retryText = this.add
      .text(width / 2, height / 2 + 80, 'PRESS SPACE TO RETRY', {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);
    this.overlayContainer.add(retryText);

    // 点滅アニメーション
    this.tweens.add({
      targets: retryText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // スペースキーでリトライ
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }
}
