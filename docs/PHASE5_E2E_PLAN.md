# フェーズ5 E2Eテスト実行計画書

## 概要

本ドキュメントはPhaser 3テトリスMVPのフェーズ5におけるE2Eスモークテスト実装の詳細計画を定義する。

---

## 実装スコープ

### 対象
- Playwrightによるスモークテスト（シーン遷移の結線確認）
- GitHub Actionsによる自動実行
- **テスト用ゲーム状態公開機能**（DOM属性経由）
- **決定論的テスト用シード機能**（URLパラメータ経由）

### 対象外
- 操作テスト（移動、回転、ライン消去の詳細検証）
- パフォーマンステスト
- ビジュアルリグレッションテスト

---

## 技術仕様

| 項目 | 設定値 |
|------|--------|
| テストフレームワーク | Playwright |
| Playwrightバージョン | **^1.50.0** (最新安定版) |
| 対象ブラウザ | Chromium のみ |
| 実行モード | Headless |
| テストタイムアウト | 30秒 |
| リトライ回数 | 1回 |
| デバッグアーティファクト | スクリーンショット + **ビデオ**（失敗時のみ） |

---

## ディレクトリ構成

```
phaser_tetris/
├── e2e/
│   └── smoke.spec.ts            # E2Eスモークテスト
├── src/__tests__/
│   └── seed.test.ts             # シード値検証テスト（新規）
├── playwright.config.ts          # Playwright設定
├── .github/
│   └── workflows/
│       ├── e2e.yml              # E2Eテスト用ワークフロー
│       └── test.yml             # ユニットテスト用ワークフロー（新規）
└── package.json                  # test:e2e スクリプト追加
```

---

## 前提: ゲームコードの修正

### E2Eテストを安定化させるため、以下の修正を本番コードに追加する

#### 1. ゲーム状態のDOM公開 (`GameScene.ts`)

```typescript
// triggerGameOver() に追加
private triggerGameOver(): void {
  this.isGameOver = true;
  document.body.setAttribute('data-game-state', 'gameover'); // 追加
  if (this.dropTimer) {
    this.dropTimer.destroy();
  }
  this.showGameOverOverlay();
}

// initGame() に追加
private initGame(): void {
  document.body.setAttribute('data-game-state', 'playing'); // 追加
  this.board = new Board();
  // ...
}
```

#### 2. シーン状態のDOM公開 (`TitleScene.ts`, `GameScene.ts`)

```typescript
// TitleScene.ts の create() に追加
create(): void {
  document.body.setAttribute('data-scene', 'title'); // 追加
  // ...
}

// GameScene.ts の create() に追加
create(): void {
  document.body.setAttribute('data-scene', 'game'); // 追加
  this.initGame();
  // ...
}
```

#### 3. テスト用シードRNG対応 (`GameScene.ts`)

```typescript
// initGame() を修正
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

  this.graphics = this.add.graphics();
  this.spawnTetromino();
}

// シード付き乱数生成器を追加
private seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}
```

---

## テストシナリオ

### smoke.spec.ts

```gherkin
Feature: ゲームフロー スモークテスト

  Scenario: タイトル画面からゲームオーバーまでの一連のフロー
    Given ゲームがブラウザで起動している（シード固定）

    # Step 1: タイトル画面の表示確認
    Then data-scene="title" になっている
    And canvasが表示されている

    # Step 2: ゲーム画面への遷移
    When スペースキーを押す
    Then data-scene="game" になるまで待機
    And data-game-state="playing" になっている

    # Step 3: テトリミノの落下確認
    When 1秒待機する
    Then ゲームが継続している（data-game-state="playing"）

    # Step 4: ゲームオーバーの誘発
    When ソフトドロップで左端にテトリミノを積み上げる
    Then data-game-state="gameover" になるまで待機（最大20秒）

    # Step 5: リトライ機能の確認
    When スペースキーを押す
    Then data-game-state="playing" になるまで待機
    And ゲームがリセットされている
```

---

## 実装詳細

### 1. Playwright設定 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry', // ビデオ録画追加
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 2. スモークテスト (`e2e/smoke.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

// テスト用固定シード（決定論的なテトリミノ順序を保証）
const TEST_SEED = 12345;

test.describe('Tetris Smoke Test', () => {
  test('complete game flow: title → game → game over → retry', async ({ page }) => {

    await test.step('Step 1: タイトル画面の表示確認', async () => {
      await page.goto(`/?seed=${TEST_SEED}`);
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-scene', 'title');
    });

    await test.step('Step 2: ゲーム画面への遷移', async () => {
      await page.keyboard.press('Space');
      // 条件ベース待機: data-scene="game" になるまで
      await expect(page.locator('body')).toHaveAttribute('data-scene', 'game', { timeout: 5000 });
      await expect(page.locator('body')).toHaveAttribute('data-game-state', 'playing');
    });

    await test.step('Step 3: テトリミノの落下確認', async () => {
      // 1秒後もゲームが継続していることを確認
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toHaveAttribute('data-game-state', 'playing');
    });

    await test.step('Step 4: ゲームオーバーの誘発', async () => {
      // ソフトドロップで左端に積み上げ
      const maxPieces = 30;
      for (let i = 0; i < maxPieces; i++) {
        // ゲームオーバーチェック（早期終了）
        const state = await page.locator('body').getAttribute('data-game-state');
        if (state === 'gameover') break;

        // 左端に移動
        for (let j = 0; j < 5; j++) {
          await page.keyboard.press('ArrowLeft');
        }

        // ソフトドロップで高速落下
        for (let k = 0; k < 25; k++) {
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(15);
        }
        await page.waitForTimeout(50);
      }

      // ゲームオーバー状態の検証（最大20秒待機）
      await expect(page.locator('body')).toHaveAttribute(
        'data-game-state',
        'gameover',
        { timeout: 20000 }
      );
    });

    await test.step('Step 5: リトライ機能の確認', async () => {
      await page.keyboard.press('Space');
      // 条件ベース待機: playing状態に戻るまで
      await expect(page.locator('body')).toHaveAttribute(
        'data-game-state',
        'playing',
        { timeout: 5000 }
      );
      // canvasが引き続き表示されていることを確認
      await expect(page.locator('canvas')).toBeVisible();
    });
  });
});
```

### 3. シード値検証用ユニットテスト (`src/__tests__/seed.test.ts`)

```typescript
import { describe, test, expect } from '@jest/globals';

// GameSceneと同じシード付き乱数生成器
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const ALL_TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;

function getTetrominoType(rng: () => number): string {
  const index = Math.floor(rng() * 7);
  return ALL_TETROMINO_TYPES[index];
}

describe('Seed RNG Verification', () => {
  test('seed 12345 produces deterministic sequence', () => {
    const rng = seededRandom(12345);
    const sequence: string[] = [];

    for (let i = 0; i < 20; i++) {
      sequence.push(getTetrominoType(rng));
    }

    // この出力をE2Eテストの期待値として使用
    console.log('Seed 12345 sequence:', sequence.join(', '));

    // 最初の10個の期待値（実装後に確定）
    // expect(sequence.slice(0, 10)).toEqual(['T', 'Z', 'L', ...]);

    // 同じシードで同じ結果になることを確認
    const rng2 = seededRandom(12345);
    const sequence2: string[] = [];
    for (let i = 0; i < 20; i++) {
      sequence2.push(getTetrominoType(rng2));
    }

    expect(sequence).toEqual(sequence2);
  });
});
```

> **目的**: シード値12345のテトリミノ順序を事前確認し、テストの信頼性を確保する。

---

### 4. GitHub Actions - E2E (`e2e.yml`)

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Playwrightブラウザのキャッシュ
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}

      - name: Install Playwright Browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright deps (if cached)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

### 5. GitHub Actions - Unit Tests (`test.yml`)

```yaml
name: Unit Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Upload coverage (optional)
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

---

### 6. package.json 変更

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
```

---

## 実装手順

### Step 1: シード値検証テスト作成
- `src/__tests__/seed.test.ts` を作成
- `npm test` でシード12345のテトリミノ順序を確認
- 出力された順序を記録

### Step 2: ゲームコード修正
- `GameScene.ts` に `data-game-state` 属性追加
- `TitleScene.ts` と `GameScene.ts` に `data-scene` 属性追加
- `GameScene.ts` にシードRNG対応追加（`seededRandom()`）

### Step 3: Playwright セットアップ
```bash
npm install -D @playwright/test@latest
npx playwright install chromium
```

### Step 4: 設定ファイル作成
- `playwright.config.ts` を作成

### Step 5: E2Eテストファイル作成
- `e2e/smoke.spec.ts` を作成

### Step 6: npm スクリプト追加
- `package.json` に `test:e2e` を追加

### Step 7: ローカル動作確認
```bash
npm run test:e2e
```

### Step 8: GitHub Actions 設定
- `.github/workflows/e2e.yml` を作成（E2Eテスト用）
- `.github/workflows/test.yml` を作成（ユニットテスト用）

### Step 9: CI 動作確認
- PR作成またはmainへpushして動作確認
- E2EとUnit Testsの両方が緑色になることを確認

---

## 成功基準

| 項目 | 基準 | 検証方法 |
|------|------|----------|
| ユニットテスト | `npm test` が成功（80件以上） | 手動実行 |
| E2Eテスト | `npm run test:e2e` が成功 | 手動実行 |
| Jest CI | GitHub Actions `Unit Tests` が緑色 | PRマージ前に確認 |
| E2E CI | GitHub Actions `E2E Tests` が緑色 | PRマージ前に確認 |
| テスト時間 | E2Eが30秒以内に完了 | Playwright HTMLレポートで確認 |
| 再現性 | 連続5回実行して全て成功 | `for i in {1..5}; do npm run test:e2e; done` |

---

## リスクと対策

| リスク | 対策 | 備考 |
|--------|------|------|
| テトリミノのランダム性によるFlaky | **シード固定RNG** | URLパラメータ `?seed=12345` で決定論的に |
| ゲームオーバー検証不可 | **data-game-state属性** | DOM属性で状態を公開 |
| CI環境での遅延 | 条件ベース待機 + リトライ1回 | `waitForTimeout` を最小化 |
| Canvas内要素の検証困難 | **data-scene属性** | シーン状態をDOM経由で公開 |
| Playwrightキャッシュなし | **actions/cache@v4** | CI実行時間を短縮 |

---

## 修正されたコード変更量

| ファイル | 変更内容 | 行数 |
|----------|----------|------|
| `GameScene.ts` | data属性追加、シードRNG対応 | +20行 |
| `TitleScene.ts` | data-scene属性追加 | +1行 |
| `src/__tests__/seed.test.ts` | **新規作成** | 35行 |
| `playwright.config.ts` | 新規作成 | 30行 |
| `e2e/smoke.spec.ts` | 新規作成 | 70行 |
| `.github/workflows/e2e.yml` | 新規作成 | 45行 |
| `.github/workflows/test.yml` | **新規作成** | 30行 |
| `package.json` | スクリプト追加 | +2行 |

---

## 改訂履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-01-22 | 1.0 | 初版作成 |
| 2025-01-22 | 2.0 | レビュー指摘対応: ゲーム状態DOM公開、シードRNG、条件ベース待機、Playwrightキャッシュ、test.step()、ビデオ録画、バージョン更新 |
| 2025-01-22 | 2.1 | 追加: シード値検証テスト(seed.test.ts)、Jest用CIワークフロー(test.yml)、実装手順更新 |
