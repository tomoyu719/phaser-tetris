import { describe, test, expect } from '@jest/globals';

// GameSceneと同じシード付き乱数生成器
function seededRandom(seed: number): () => number {
  let currentSeed = seed;
  return () => {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    return currentSeed / 0x7fffffff;
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

    // 同じシードで同じ結果になることを確認
    const rng2 = seededRandom(12345);
    const sequence2: string[] = [];
    for (let i = 0; i < 20; i++) {
      sequence2.push(getTetrominoType(rng2));
    }

    expect(sequence).toEqual(sequence2);
  });

  test('different seeds produce different sequences', () => {
    const rng1 = seededRandom(12345);
    const rng2 = seededRandom(54321);

    const seq1 = Array.from({ length: 10 }, () => getTetrominoType(rng1));
    const seq2 = Array.from({ length: 10 }, () => getTetrominoType(rng2));

    // 異なるシードは異なる結果を生成する（高確率）
    expect(seq1).not.toEqual(seq2);
  });

  test('seededRandom produces values in range [0, 1)', () => {
    const rng = seededRandom(12345);

    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
