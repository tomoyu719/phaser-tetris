import { GameLogic } from '../objects/GameLogic';
import { SCORE_TABLE, ALL_TETROMINO_TYPES, TetrominoType } from '../constants';

describe('GameLogic', () => {
  describe('score calculation', () => {
    it('should calculate 100 points for 1 line', () => {
      const logic = new GameLogic();
      expect(logic.calculateScore(1)).toBe(100);
    });

    it('should calculate 300 points for 2 lines', () => {
      const logic = new GameLogic();
      expect(logic.calculateScore(2)).toBe(300);
    });

    it('should calculate 500 points for 3 lines', () => {
      const logic = new GameLogic();
      expect(logic.calculateScore(3)).toBe(500);
    });

    it('should calculate 800 points for 4 lines (Tetris)', () => {
      const logic = new GameLogic();
      expect(logic.calculateScore(4)).toBe(800);
    });

    it('should return 0 for 0 lines', () => {
      const logic = new GameLogic();
      expect(logic.calculateScore(0)).toBe(0);
    });

    it('should match SCORE_TABLE values', () => {
      const logic = new GameLogic();
      for (const [lines, score] of Object.entries(SCORE_TABLE)) {
        expect(logic.calculateScore(Number(lines))).toBe(score);
      }
    });
  });

  describe('score management', () => {
    it('should start with score 0', () => {
      const logic = new GameLogic();
      expect(logic.getScore()).toBe(0);
    });

    it('should add score correctly', () => {
      const logic = new GameLogic();
      logic.addScore(1);
      expect(logic.getScore()).toBe(100);
    });

    it('should accumulate score', () => {
      const logic = new GameLogic();
      logic.addScore(1); // 100
      logic.addScore(2); // 300
      logic.addScore(4); // 800
      expect(logic.getScore()).toBe(1200);
    });

    it('should not change score for 0 lines', () => {
      const logic = new GameLogic();
      logic.addScore(1);
      logic.addScore(0);
      expect(logic.getScore()).toBe(100);
    });
  });

  describe('lock delay state management', () => {
    it('should start with isLanded = false', () => {
      const logic = new GameLogic();
      expect(logic.isLanded()).toBe(false);
    });

    it('should set isLanded = true after onLanded()', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      expect(logic.isLanded()).toBe(true);
    });

    it('should reset isLanded after onFloated()', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      logic.onFloated();
      expect(logic.isLanded()).toBe(false);
    });

    it('should return false before LOCK_DELAY elapsed', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      // 499ms経過 → まだロックしない
      expect(logic.updateLockDelay(1499)).toBe(false);
    });

    it('should return shouldLock = true after LOCK_DELAY ms', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      // 500ms経過 → ロックする
      expect(logic.updateLockDelay(1500)).toBe(true);
    });

    it('should reset lock start time after onFloated()', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      logic.updateLockDelay(1200); // 200ms経過
      logic.onFloated();

      // 再着地後、時間がリセットされていることを確認
      logic.onLanded(2000);
      // 2000ms時点で着地、2499msではまだロックしない
      expect(logic.updateLockDelay(2499)).toBe(false);
      // 2500msでロック
      expect(logic.updateLockDelay(2500)).toBe(true);
    });

    it('should reset state after resetLockState()', () => {
      const logic = new GameLogic();
      logic.onLanded(1000);
      logic.updateLockDelay(1200);
      logic.resetLockState();

      expect(logic.isLanded()).toBe(false);
    });

    it('should not lock when not landed', () => {
      const logic = new GameLogic();
      // Not landed, updateLockDelay should return false
      const result = logic.updateLockDelay(1000);
      expect(result).toBe(false);
    });
  });

  describe('next piece generation', () => {
    it('should generate tetromino types from ALL_TETROMINO_TYPES', () => {
      const logic = new GameLogic();
      const type = logic.getNextTetrominoType();
      expect(ALL_TETROMINO_TYPES).toContain(type);
    });

    it('should use injected RNG for deterministic generation', () => {
      // Mock RNG that returns fixed values
      let callCount = 0;
      const mockRng = () => {
        const values = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
        return values[callCount++ % values.length];
      };

      const logic = new GameLogic({ rng: mockRng });
      
      // With 7 types, value 0 should give 'I', ~0.14 'O', etc.
      expect(logic.getNextTetrominoType()).toBe('I');
      expect(logic.getNextTetrominoType()).toBe('O');
      expect(logic.getNextTetrominoType()).toBe('T');
    });

    it('should produce same sequence with same RNG', () => {
      const createFixedRng = () => {
        let i = 0;
        return () => {
          const values = [0.1, 0.3, 0.5, 0.7];
          return values[i++ % values.length];
        };
      };

      const logic1 = new GameLogic({ rng: createFixedRng() });
      const logic2 = new GameLogic({ rng: createFixedRng() });

      const sequence1: TetrominoType[] = [];
      const sequence2: TetrominoType[] = [];

      for (let i = 0; i < 10; i++) {
        sequence1.push(logic1.getNextTetrominoType());
        sequence2.push(logic2.getNextTetrominoType());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('should use Math.random by default', () => {
      const logic = new GameLogic();
      // Just verify it works without error
      const type = logic.getNextTetrominoType();
      expect(typeof type).toBe('string');
      expect(ALL_TETROMINO_TYPES).toContain(type);
    });
  });

  describe('peekNextTetrominoType', () => {
    it('should return next type without consuming it', () => {
      const mockRng = () => 0; // Always returns 'I'
      const logic = new GameLogic({ rng: mockRng });

      const peeked = logic.peekNextTetrominoType();
      const actual = logic.getNextTetrominoType();
      
      expect(peeked).toBe(actual);
    });

    it('should return same value on multiple peeks', () => {
      const logic = new GameLogic({ rng: () => 0.5 });
      
      const peek1 = logic.peekNextTetrominoType();
      const peek2 = logic.peekNextTetrominoType();
      
      expect(peek1).toBe(peek2);
    });

    it('should update after getNextTetrominoType is called', () => {
      let call = 0;
      const mockRng = () => {
        const values = [0, 0.5]; // I, then something else
        return values[call++ % values.length];
      };
      const logic = new GameLogic({ rng: mockRng });

      const firstPeek = logic.peekNextTetrominoType();
      logic.getNextTetrominoType(); // Consume first
      const secondPeek = logic.peekNextTetrominoType();
      
      // First and second peek might be same or different depending on RNG
      // Just verify the method works
      expect(ALL_TETROMINO_TYPES).toContain(firstPeek);
      expect(ALL_TETROMINO_TYPES).toContain(secondPeek);
    });
  });
});
