# テトリス MVP ディレクトリ構造設計書

## 1. 概要

本ドキュメントはPhaser 3テトリスMVPのディレクトリ構造を定義する。

### 1.1 設計方針

| 項目 | 方針 |
|------|------|
| 定数管理 | 1ファイルに集約 |
| 型定義 | 各ファイル内にインライン定義 |
| ユーティリティ | クラスメソッドとして実装 |
| アセット | 図形描画のみ（画像不使用） |
| テスト | `src/__tests__/` に配置 |
| CSS | `index.html` 内にインライン記述 |

---

## 2. ディレクトリ構造

```
phaser_tetris/
├── docs/
│   ├── REQUIREMENTS.md        # 要件定義書
│   └── DIRECTORY_STRUCTURE.md # 本ドキュメント
├── src/
│   ├── main.ts                # エントリーポイント
│   ├── config.ts              # Phaser設定
│   ├── constants.ts           # 全定数定義
│   ├── scenes/
│   │   ├── TitleScene.ts      # タイトル画面
│   │   ├── GameScene.ts       # ゲーム画面
│   │   └── GameOverScene.ts   # ゲームオーバー画面
│   ├── objects/
│   │   ├── Tetromino.ts       # テトリミノクラス
│   │   ├── Board.ts           # ゲームボードクラス
│   │   └── Block.ts           # 単一ブロッククラス
│   └── __tests__/
│       ├── Tetromino.test.ts  # テトリミノテスト
│       ├── Board.test.ts      # ボードテスト
│       └── GameScene.test.ts  # ゲームシーンテスト
├── public/
│   └── index.html             # HTMLエントリー（CSS含む）
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. ファイル詳細

### 3.1 エントリーポイント

| ファイル | 責務 |
|----------|------|
| `src/main.ts` | Phaserゲームインスタンス生成、起動 |
| `src/config.ts` | Phaser.Types.Core.GameConfig定義 |
| `public/index.html` | HTML構造、インラインCSS、canvas配置 |

### 3.2 定数 (`src/constants.ts`)

単一ファイルに以下を集約:

```typescript
// ゲーム設定
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const CELL_SIZE = 32;
export const DROP_INTERVAL = 1000;
export const SOFT_DROP_INTERVAL = 50;

// スコア
export const SCORE_TABLE = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// テトリミノ定義
export const TETROMINOS = {
  I: { shape: [[1,1,1,1]], color: 0x00ffff },
  O: { shape: [[1,1],[1,1]], color: 0xffff00 },
  // ... 他5種
};
```

### 3.3 シーン (`src/scenes/`)

| ファイル | 責務 | 主要メソッド |
|----------|------|--------------|
| `TitleScene.ts` | タイトル表示、開始入力待ち | `create()`, `startGame()` |
| `GameScene.ts` | ゲームループ、入力処理、描画 | `create()`, `update()`, `handleInput()` |
| `GameOverScene.ts` | 結果表示、リトライ入力待ち | `create()`, `restart()` |

### 3.4 ゲームオブジェクト (`src/objects/`)

| ファイル | 責務 | 主要メソッド |
|----------|------|--------------|
| `Block.ts` | 単一ブロックの描画 | `draw()`, `clear()` |
| `Tetromino.ts` | テトリミノ管理、移動、回転 | `moveLeft()`, `moveRight()`, `rotate()`, `canMove()` |
| `Board.ts` | フィールド状態管理、衝突判定、ライン消去 | `checkCollision()`, `lockTetromino()`, `clearLines()` |

### 3.5 テスト (`src/__tests__/`)

| ファイル | テスト対象 |
|----------|-----------|
| `Tetromino.test.ts` | 移動、回転、形状データ |
| `Board.test.ts` | 衝突判定、ライン消去、固定処理 |
| `GameScene.test.ts` | ゲームフロー、スコア計算 |

---

## 4. 依存関係

```
main.ts
  └── config.ts
        └── scenes/*
              ├── TitleScene.ts
              ├── GameScene.ts ──┬── Board.ts ─── Block.ts
              │                  └── Tetromino.ts ─── Block.ts
              └── GameOverScene.ts

constants.ts （全体から参照）
```

---

## 5. 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | PascalCase（クラス）、camelCase（その他） | `GameScene.ts`, `constants.ts` |
| クラス名 | PascalCase | `Tetromino`, `Board` |
| 定数 | UPPER_SNAKE_CASE | `BOARD_WIDTH`, `DROP_INTERVAL` |
| メソッド/変数 | camelCase | `checkCollision()`, `currentScore` |

---

## 6. 改訂履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-01-21 | 1.0 | 初版作成 |
