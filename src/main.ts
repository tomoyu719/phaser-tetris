import Phaser from 'phaser';

class HelloScene extends Phaser.Scene {
  constructor() {
    super('HelloScene');
  }

  create() {
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Hello Phaser!',
      {
        fontSize: '48px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#2d2d2d',
  scene: HelloScene,
};

new Phaser.Game(config);
