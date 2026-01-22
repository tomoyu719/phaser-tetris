import { test, expect } from '@playwright/test';

// テスト用固定シード（決定論的なテトリミノ順序を保証）
// シード12345の順序: Z, T, Z, L, Z, Z, O, L, Z, J, J, T, J, O, Z, O, O, J, L, J
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
      // ソフトドロップで積み上げ（タイムアウト対策: より高速に）
      const maxAttempts = 50;

      for (let i = 0; i < maxAttempts; i++) {
        // ゲームオーバーチェック（早期終了）
        const state = await page.locator('body').getAttribute('data-game-state');
        if (state === 'gameover') break;

        // 左端に素早く移動
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        // 下キーを押し続けてソフトドロップ
        await page.keyboard.down('ArrowDown');
        await page.waitForTimeout(600); // ソフトドロップで落下完了を待つ
        await page.keyboard.up('ArrowDown');

        await page.waitForTimeout(100); // 次のピース生成を待つ
      }

      // ゲームオーバー状態の検証（最大25秒待機）
      await expect(page.locator('body')).toHaveAttribute(
        'data-game-state',
        'gameover',
        { timeout: 25000 }
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
