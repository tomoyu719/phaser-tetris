# テトリス MVP 実装計画

## 概要

本ドキュメントはPhaser 3テトリスMVPの実装計画とTODOリストを定義する。
TDD（テスト駆動開発）アプローチに従い、テストを先に書いてから実装を行う。

---

## テスト方針

### アーキテクチャ分離によるテスト戦略

PhaserシーンはCanvas API、WebGL、タイマーに依存しており、Jest単体でのテストは複雑で不安定になる。
そのため、**ゲームロジックをPhaserから分離**し、テスト可能な設計とする。

```
[純粋ロジック層 - テスト対象]     [描画層 - テスト対象外]
┌─────────────────────────┐      ┌─────────────────────────┐
│  Board.ts               │ ←使用─ │  GameScene.ts           │
│  Tetromino.ts           │      │  TitleScene.ts          │
│  GameLogic.ts (※新規)   │      │  (GameOverはオーバーレイ)  │
│  (Phaser依存なし)        │      │  BlockRenderer.ts       │
└─────────────────────────┘      │  (Phaser依存)            │
         ↑                       └─────────────────────────┘
     Jestでテスト                          ↑
                                     手動テスト/E2E

```

| レイヤー | Phaser依存 | テスト方法 |
|----------|-----------|------------|
| `Board.ts`, `Tetromino.ts`, `GameLogic.ts` | **なし** | Jest単体テスト |
| `BlockRenderer.ts` (描画) | あり | テスト対象外 |
| シーン (`*Scene.ts`) | あり | **E2Eスモーク** + 手動テスト |

### テスト対象の明確化

**テストする（Jest）:**
- Tetromino: 移動、回転、形状データ
- Board: 衝突判定、ライン消去、固定処理、ゲームオーバー判定
- **GameLogic: スコア計算、ロックディレイ状態管理、次ピース生成**

**テストしない（単体テスト）:**
- BlockRenderer: Phaser Graphics APIに依存
- シーン: Canvas/タイマー/入力のみ依存（ロジックはGameLogicに委譲）

**E2Eスモークテスト（Playwright）:**
- シーン遷移の結線確認（Title → Game → GameOverオーバーレイ → Game再起動）
- 基本動作の疎通確認（起動、入力応答、画面遷移）

---

## フェーズ 1: プロジェクト基盤整備

### 1.1 テスト環境セットアップ
- [x] Jestのインストールと設定
  ```bash
  npm install -D jest ts-jest @types/jest
  ```
- [x] `jest.config.js` の作成（ESM対応版）
  ```javascript
  export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
      '^.+\\.ts$': ['ts-jest', { useESM: true }],
    },
  };
  ```
- [x] `src/__tests__/` ディレクトリの作成
- [x] サンプルテストの作成と動作確認
- [x] `package.json` に `"test": "jest"` スクリプト追加

### 1.2 プロジェクト構造の整備
- [x] `src/config.ts` の作成（Phaser設定を分離）
- [x] `src/constants.ts` の作成（定数ファイル）
- [x] `src/scenes/` ディレクトリの作成
- [x] `src/objects/` ディレクトリの作成
- [x] `src/main.ts` のリファクタリング（HelloScene削除、config参照）

---

## フェーズ 2: 定数とデータ構造の定義

### 2.1 定数定義 (`constants.ts`)
- [x] ゲーム設定定数
  - `BOARD_WIDTH = 10`
  - `BOARD_HEIGHT = 20`
  - `CELL_SIZE = 32`
  - `DROP_INTERVAL = 1000`
  - `SOFT_DROP_INTERVAL = 50`
  - `LOCK_DELAY = 1` (フレーム数: 着地後、次フレームで固定)
- [x] スコアテーブル
  - `SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 }`
- [x] テトリミノ定義（7種類の形状と色）
  - I: シアン (0x00ffff)
  - O: 黄色 (0xffff00)
  - T: 紫 (0x800080)
  - S: 緑 (0x00ff00)
  - Z: 赤 (0xff0000)
  - J: 青 (0x0000ff)
  - L: オレンジ (0xffa500)

---

## フェーズ 3: コアロジックの実装（TDD）

### 3.1 Tetromino クラス (`objects/Tetromino.ts`) - Phaser非依存
- [x] テスト: `Tetromino.test.ts` の作成
  - 初期化テスト（形状、位置、色）
  - 左移動テスト
  - 右移動テスト
  - 下移動テスト
  - 左回転テスト（形状変化の確認）
  - 右回転テスト（形状変化の確認）
  - **回転キャンセルテスト（undoRotateで元の形状に戻る）**
  - 形状取得テスト
- [x] 実装: `Tetromino.ts`
  - `constructor(type)`: テトリミノ生成
  - `moveLeft()`: 左移動
  - `moveRight()`: 右移動
  - `moveDown()`: 下移動
  - `rotateLeft()`: 左回転（反時計回り）
  - `rotateRight()`: 右回転（時計回り）
  - **`undoRotate()`: 直前の回転を取り消す（回転キャンセル用）**
  - `getShape()`: 現在の形状取得
  - `getPosition()`: 現在の位置取得
  - `getColor()`: 色取得

### 3.2 Board クラス (`objects/Board.ts`) - Phaser非依存
- [x] テスト: `Board.test.ts` の作成
  - 初期化テスト（空のボード）
  - 衝突判定テスト（壁、床、他ブロック）
  - **回転後の衝突判定テスト（壁際で回転→衝突検知）**
  - テトリミノ固定テスト
  - ライン消去テスト（1〜4ライン）
  - ゲームオーバー判定テスト
  - **境界条件テスト**
    - 出現位置での衝突（盤面上部にブロックがある状態で新規テトリミノ）
    - 盤面上端でのテトリミノ固定（Y=0付近での固定が正しく動作）
    - ライン消去後の落下整合（消去後、上のブロックが正しく落下）
    - 複数ライン同時消去後の盤面整合性
- [x] 実装: `Board.ts`
  - `constructor()`: 10x20の空ボード生成
  - `checkCollision(tetromino, offsetX, offsetY)`: 衝突判定
    - ※ 回転後のtetrominoをそのまま渡せば回転衝突判定として機能
  - `lockTetromino(tetromino)`: テトリミノをボードに固定
  - `clearLines()`: 揃ったラインを消去、消去数を返す
  - `isGameOver(tetromino)`: ゲームオーバー判定（出現位置で衝突するか）
  - `getGrid()`: ボード状態取得（描画用）

### 3.3 GameLogic クラス (`objects/GameLogic.ts`) - Phaser非依存
- [x] テスト: `GameLogic.test.ts` の作成
  - **スコア計算テスト**
    - 1ライン消去 → 100点
    - 2ライン消去 → 300点
    - 3ライン消去 → 500点
    - 4ライン消去 → 800点
    - 累積スコアの確認
  - **ロックディレイ状態管理テスト**
    - 着地検知 → isLanded = true
    - フレーム経過 → lockCounter増加
    - lockCounter >= LOCK_DELAY → shouldLock = true
    - 浮いた場合 → isLanded = false にリセット
  - **次ピース生成テスト**
    - 7種類のテトリミノからランダム選択
    - **RNG注入で決定論的に動作することを確認**
      ```typescript
      // テスト例: 固定シーケンスを返すモックRNG
      const mockRng = createSequenceRng([0, 0.15, 0.3, ...]); // I, O, T, ...
      const logic = new GameLogic({ rng: mockRng });
      expect(logic.getNextTetrominoType()).toBe('I');
      expect(logic.getNextTetrominoType()).toBe('O');
      ```
    - 同じRNGで同じ順序が再現されることを確認
    - **RNGマッピング定義**:
      ```
      index = Math.floor(rng() * 7)
      ALL_TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
      
      rng値 → index → Type
      0.00-0.14 → 0 → I
      0.14-0.28 → 1 → O
      0.28-0.42 → 2 → T
      0.42-0.57 → 3 → S
      0.57-0.71 → 4 → Z
      0.71-0.85 → 5 → J
      0.85-1.00 → 6 → L
      ```
- [x] 実装: `GameLogic.ts`
  - **`constructor(options?: { rng?: () => number })`**: RNG注入可能
    ```typescript
    // 使用例
    new GameLogic()                          // デフォルト: Math.random
    new GameLogic({ rng: seededRandom(42) }) // シード付きRNG
    new GameLogic({ rng: () => 0.5 })        // テスト用固定値
    ```
  - `calculateScore(linesCleared: number): number`: スコア計算
  - `addScore(linesCleared: number): void`: スコア加算
  - `getScore(): number`: 現在スコア取得
  - `onLanded(): void`: 着地時に呼び出し
  - `onFloated(): void`: 浮いた時に呼び出し（着地キャンセル）
  - `updateLockDelay(): boolean`: フレーム毎に呼び出し、固定すべきかを返す
  - `resetLockState(): void`: ロック状態リセット（固定後）
  - `getNextTetrominoType(): TetrominoType`: 次のテトリミノタイプを返す（内部でthis.rng()使用）
  - `peekNextTetrominoType(): TetrominoType`: 次のテトリミノを覗き見（UI表示用）

### 3.4 BlockRenderer クラス (`objects/BlockRenderer.ts`) - テスト対象外
- [x] 実装: `BlockRenderer.ts`（Phaser Graphics APIを使用）
  - `drawBlock(graphics, x, y, color)`: 単一ブロック描画
  - `drawTetromino(graphics, tetromino)`: テトリミノ描画
  - `drawBoard(graphics, board)`: ボード全体描画
  - `clear(graphics)`: 描画クリア

> **注意**: このクラスはPhaser依存のため、Jestでのユニットテストは行わない。
> 動作確認はブラウザでの手動テストで行う。

---

## フェーズ 4: シーンの実装（手動テスト）

### 4.1 TitleScene (`scenes/TitleScene.ts`)
- [x] シーンの基本構造
- [x] タイトルテキスト表示（"TETRIS"）
- [x] 開始案内テキスト表示（"PRESS SPACE TO START"）
- [x] スペースキー入力でGameSceneへ遷移

### 4.2 GameScene (`scenes/GameScene.ts`)
- [x] シーンの基本構造
- [x] **GameLogicインスタンスの保持**（スコア、ロックディレイ、次ピース管理を委譲）
- [x] ゲームフィールド描画（320x640px）
- [x] UIエリア描画（NEXT、SCORE）
  - **NEXT表示には `gameLogic.peekNextTetrominoType()` を使用**（消費しない覗き見）
- [x] テトリミノ生成・管理
  - **生成時は `gameLogic.getNextTetrominoType()` で取得**（消費して次を準備）
  - 現在のテトリミノ管理
- [x] 入力処理
  - 左矢印: 左移動（衝突時は無視）
  - 右矢印: 右移動（衝突時は無視）
  - 下矢印: ソフトドロップ
  - 上矢印/Z: 左回転（**回転キャンセル対応**）
  - X: 右回転（**回転キャンセル対応**）
  - **回転キャンセルフロー:**
    ```
    1. tetromino.rotateLeft() または rotateRight() 実行
    2. board.checkCollision(tetromino, 0, 0) で衝突判定
    3. 衝突あり → tetromino.undoRotate() でキャンセル
    4. 衝突なし → 回転確定
    5. 移動/回転が成功し、下方向に移動可能になった場合 → gameLogic.onFloated() で着地状態解除
    ```
  - **着地状態解除の判定:**
    - 左右移動・回転が成功した後、`board.checkCollision(tetromino, 0, 1)` で下移動可能か確認
    - 下移動可能（衝突なし）なら `gameLogic.onFloated()` を呼び出す
- [x] ゲームループ実装
  - 自動落下（1000ms間隔）
  - ソフトドロップ（50ms間隔）
    - **継続入力方式**: 下キーを押している間のみ50ms間隔で落下
    - **キーリリース時**: 1000ms間隔に復帰
    - **実装**: `cursors.down.isDown` で押下状態を監視し、落下タイマーの間隔を切り替え
  - 衝突判定（下方向）
  - **ロックディレイ処理**（GameLogicに委譲）
    ```
    1. 落下試行 → 下に移動できない → gameLogic.onLanded()
    2. 左右移動/回転で浮いたら → gameLogic.onFloated()
    3. 毎フレーム gameLogic.updateLockDelay() を呼び出し
    4. true が返ったら固定実行 → gameLogic.resetLockState()
    ```
    > **注意**: `updateLockDelay()` は Phaser の `update()` メソッド内で
    > 毎フレーム呼び出すこと。`LOCK_DELAY=1` の場合、着地後の次フレームで固定される。
  - テトリミノ固定（board.lockTetromino）
  - ライン消去（board.clearLines）
  - **スコア更新**（`gameLogic.addScore(linesCleared)`）
  - **次のテトリミノ生成**（`gameLogic.getNextTetrominoType()`）
- [x] ゲームオーバー判定とオーバーレイ表示

### 4.3 ゲームオーバー表示（GameScene内オーバーレイ）
- [x] オーバーレイ表示の実装（半透明黒背景）
- [x] 「GAME OVER」テキスト表示
- [x] 最終スコア表示
- [x] リトライ案内テキスト表示（"PRESS SPACE TO RETRY"）
- [x] スペースキー入力で**GameSceneを再起動**（即リトライ）

> **設計変更**: 別シーン（GameOverScene.ts）ではなく、GameScene内でオーバーレイ表示する方式に変更。
> ゲーム終了時の盤面を背景に見せることで、達成感・悔しさを演出できる。

---

## フェーズ 5: 統合と仕上げ

### 5.1 設定ファイル整備
- [ ] `config.ts` の完成
  - ゲームサイズ設定（フィールド + UI）
  - シーン登録（Title, Game）※GameOverはオーバーレイ方式のため不要
  - 背景色設定

### 5.2 エントリーポイント整備
- [ ] `main.ts` のリファクタリング
  - config読み込み
  - ゲームインスタンス生成

### 5.3 UI/UX調整
- [ ] `index.html` のスタイリング
  - キャンバスの中央配置
  - 背景色設定
- [ ] フォント・色の統一
- [ ] キー入力のレスポンス調整

### 5.4 動作確認
- [ ] 全テストの実行と確認（Jest）
- [ ] **E2Eスモークテスト**（Playwright推奨）
  - セットアップ: `npm install -D @playwright/test`
  - 基本シナリオの自動テスト:
    ```
    1. ゲーム起動 → タイトル画面が表示される
    2. スペースキー → GameSceneに遷移
    3. テトリミノが表示・落下する
    4. 意図的にゲームオーバー → オーバーレイ表示
    5. スペースキー → GameSceneが再起動（即リトライ）
    ```
  - 目的: シーン間の結線ミス早期検知
  - 実行: `npm run test:e2e`（CI統合可能）
- [ ] ブラウザでの手動テスト（詳細確認）
  - 全テトリミノの動作確認
  - ライン消去の確認
  - スコア加算の確認
  - 操作感の確認

---

## 実装順序サマリー

```
1. テスト環境セットアップ (Jest)
2. プロジェクト構造整備
3. 定数定義 (constants.ts)
4. Tetromino クラス (TDD) ← Phaser非依存
5. Board クラス (TDD) ← Phaser非依存
6. GameLogic クラス (TDD) ← Phaser非依存、スコア/ロックディレイ/次ピース
7. BlockRenderer クラス ← テスト対象外
8. TitleScene ← 手動テスト
9. GameScene（ゲームオーバーオーバーレイ含む） ← 手動テスト（ロジックはGameLogicに委譲済）
10. 統合・仕上げ
```

---

## 見積もり工数

| フェーズ | 項目数 | 備考 |
|----------|--------|------|
| フェーズ 1 | 7 | 基盤整備 |
| フェーズ 2 | 3 | 定数定義 |
| フェーズ 3 | 7 | コアロジック（TDD: Tetromino, Board, GameLogic）+ BlockRenderer |
| フェーズ 4 | 5 | シーン実装（手動テスト、ロジックはGameLogicに委譲） |
| フェーズ 5 | 5 | 統合・仕上げ |
| **合計** | **27** | - |

---

## 改訂履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-01-21 | 1.0 | 初版作成 |
| 2025-01-21 | 1.1 | テスト方針追加、アーキテクチャ分離（Phaser依存/非依存）を明確化 |
| 2025-01-21 | 1.2 | ロックディレイ（着地後、次フレームで固定）の概念をゲームループに追加 |
| 2025-01-21 | 1.3 | 回転キャンセル設計を追加（undoRotate、衝突判定フロー） |
| 2025-01-21 | 1.4 | GameLogic.ts追加（スコア計算、ロックディレイ、次ピース生成をTDD対象に） |
| 2025-01-21 | 1.5 | GameLogicにRNG注入設計を追加（テストの決定論的実行を保証） |
| 2025-01-21 | 1.6 | Board境界条件テスト追加、E2Eスモークテスト（Playwright）計画追加 |
| 2025-01-22 | 1.7 | GameOverをオーバーレイ方式に変更、リトライ時はGameScene直接再起動に変更 |
