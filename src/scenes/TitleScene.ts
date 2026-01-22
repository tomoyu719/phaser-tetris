import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // タイトルテキスト
    this.add
      .text(width / 2, height / 3, 'TETRIS', {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    // 開始案内テキスト
    const startText = this.add
      .text(width / 2, height / 2 + 50, 'PRESS SPACE TO START', {
        fontSize: '24px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    // 点滅アニメーション
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // スペースキーでGameSceneへ遷移
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
