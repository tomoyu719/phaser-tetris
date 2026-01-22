import { Tetromino } from '../objects/Tetromino';
import {
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  SPAWN_X,
  SPAWN_Y,
  TetrominoType,
} from '../constants';

describe('Tetromino', () => {
  describe('initialization', () => {
    it('should initialize with correct shape for T tetromino', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][0]);
    });

    it('should initialize with correct position (spawn position)', () => {
      const tetromino = new Tetromino('T');
      const pos = tetromino.getPosition();
      expect(pos.x).toBe(SPAWN_X);
      expect(pos.y).toBe(SPAWN_Y);
    });

    it('should initialize with correct color', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.getColor()).toBe(TETROMINO_COLORS['T']);
    });

    it.each<TetrominoType>(['I', 'O', 'T', 'S', 'Z', 'J', 'L'])(
      'should initialize %s tetromino correctly',
      (type) => {
        const tetromino = new Tetromino(type);
        expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES[type][0]);
        expect(tetromino.getColor()).toBe(TETROMINO_COLORS[type]);
      }
    );
  });

  describe('movement', () => {
    it('should move left', () => {
      const tetromino = new Tetromino('T');
      const initialX = tetromino.getPosition().x;
      tetromino.moveLeft();
      expect(tetromino.getPosition().x).toBe(initialX - 1);
    });

    it('should move right', () => {
      const tetromino = new Tetromino('T');
      const initialX = tetromino.getPosition().x;
      tetromino.moveRight();
      expect(tetromino.getPosition().x).toBe(initialX + 1);
    });

    it('should move down', () => {
      const tetromino = new Tetromino('T');
      const initialY = tetromino.getPosition().y;
      tetromino.moveDown();
      expect(tetromino.getPosition().y).toBe(initialY + 1);
    });

    it('should move up (for undo purposes)', () => {
      const tetromino = new Tetromino('T');
      const initialY = tetromino.getPosition().y;
      tetromino.moveUp();
      expect(tetromino.getPosition().y).toBe(initialY - 1);
    });
  });

  describe('rotation', () => {
    it('should rotate right (clockwise)', () => {
      const tetromino = new Tetromino('T');
      const initialShape = tetromino.getShape();
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][1]);
      expect(tetromino.getShape()).not.toEqual(initialShape);
    });

    it('should rotate left (counter-clockwise)', () => {
      const tetromino = new Tetromino('T');
      tetromino.rotateLeft();
      // Rotating left from state 0 should go to state 3
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][3]);
    });

    it('should cycle through all 4 rotation states when rotating right', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][0]);
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][1]);
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][2]);
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][3]);
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][0]);
    });

    it('should cycle through all 4 rotation states when rotating left', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][0]);
      tetromino.rotateLeft();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][3]);
      tetromino.rotateLeft();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][2]);
      tetromino.rotateLeft();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][1]);
      tetromino.rotateLeft();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['T'][0]);
    });

    it('should not change O tetromino shape on rotation', () => {
      const tetromino = new Tetromino('O');
      const initialShape = tetromino.getShape();
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(initialShape);
      tetromino.rotateLeft();
      expect(tetromino.getShape()).toEqual(initialShape);
    });
  });

  describe('undoRotate (rotation cancel)', () => {
    it('should undo right rotation', () => {
      const tetromino = new Tetromino('T');
      const initialShape = tetromino.getShape();
      tetromino.rotateRight();
      expect(tetromino.getShape()).not.toEqual(initialShape);
      tetromino.undoRotate();
      expect(tetromino.getShape()).toEqual(initialShape);
    });

    it('should undo left rotation', () => {
      const tetromino = new Tetromino('T');
      const initialShape = tetromino.getShape();
      tetromino.rotateLeft();
      expect(tetromino.getShape()).not.toEqual(initialShape);
      tetromino.undoRotate();
      expect(tetromino.getShape()).toEqual(initialShape);
    });

    it('should only undo the most recent rotation (single undo)', () => {
      const tetromino = new Tetromino('T');
      const state0 = TETROMINO_SHAPES['T'][0];
      const state1 = TETROMINO_SHAPES['T'][1];
      const state2 = TETROMINO_SHAPES['T'][2];

      tetromino.rotateRight(); // 0 -> 1
      tetromino.rotateRight(); // 1 -> 2
      expect(tetromino.getShape()).toEqual(state2);

      tetromino.undoRotate(); // 2 -> 1
      expect(tetromino.getShape()).toEqual(state1);

      // Second undoRotate does nothing (only single undo supported)
      tetromino.undoRotate();
      expect(tetromino.getShape()).toEqual(state1);
    });

    it('should handle undo when no rotation has been made', () => {
      const tetromino = new Tetromino('T');
      const initialShape = tetromino.getShape();
      // undoRotate should be safe to call even without prior rotation
      tetromino.undoRotate();
      expect(tetromino.getShape()).toEqual(initialShape);
    });
  });

  describe('shape retrieval', () => {
    it('should return current shape without modification', () => {
      const tetromino = new Tetromino('I');
      const shape = tetromino.getShape();
      expect(shape).toEqual(TETROMINO_SHAPES['I'][0]);
    });

    it('should return shape that reflects current rotation state', () => {
      const tetromino = new Tetromino('I');
      tetromino.rotateRight();
      expect(tetromino.getShape()).toEqual(TETROMINO_SHAPES['I'][1]);
    });
  });

  describe('getType', () => {
    it.each<TetrominoType>(['I', 'O', 'T', 'S', 'Z', 'J', 'L'])(
      'should return correct type for %s tetromino',
      (type) => {
        const tetromino = new Tetromino(type);
        expect(tetromino.getType()).toBe(type);
      }
    );
  });
});
