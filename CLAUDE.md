# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phaser 3 Tetris game built with TypeScript and Vite. Currently in early development with a "Hello Phaser" demo. Requirements and architecture are documented in Japanese in the `docs/` folder.

## Build Commands

```bash
npm run dev      # Start dev server (port 5173, hot reload)
npm run build    # TypeScript compile + Vite production build
npm run preview  # Preview production build locally
```

Note: Testing framework not yet configured. Planned to use Jest with tests in `src/__tests__/`.

## Development Approach

This project follows **Test-Driven Development (TDD)**:
1. Write a failing test first
2. Write minimal code to make the test pass
3. Refactor while keeping tests green

Test files go in `src/__tests__/` with `.test.ts` suffix (e.g., `Board.test.ts`).

## Architecture

### Planned Structure (from docs/DIRECTORY_STRUCTURE.md)

```
src/
├── main.ts           # Entry point - creates Phaser game instance
├── config.ts         # Phaser.Types.Core.GameConfig
├── constants.ts      # All constants (BOARD_WIDTH, CELL_SIZE, TETROMINOS, etc.)
├── scenes/
│   ├── TitleScene.ts     # Title screen
│   ├── GameScene.ts      # Main gameplay
│   └── GameOverScene.ts  # Game over screen
├── objects/
│   ├── Block.ts          # Single block drawing
│   ├── Tetromino.ts      # Tetromino logic (move, rotate)
│   └── Board.ts          # Game board state, collision, line clearing
└── __tests__/            # Unit tests
```

### Key Design Decisions

- **Constants**: Aggregate in single `constants.ts` file
- **Types**: Inline in each file (no separate types folder)
- **Assets**: Shape drawing only via Phaser graphics API (no external images)
- **CSS**: Inline in `index.html`

### Dependency Flow

```
main.ts → config.ts → scenes/*
                      ├── TitleScene.ts
                      ├── GameScene.ts → Board.ts, Tetromino.ts → Block.ts
                      └── GameOverScene.ts

constants.ts (referenced globally)
```

## Game Specifications (from docs/REQUIREMENTS.md)

- **Field**: 10x20 grid, 32px cells (320x640px display)
- **Tetrominos**: 7 standard pieces (I, O, T, S, Z, J, L)
- **Drop interval**: 1000ms normal, 50ms soft drop
- **Controls**: Arrow keys for movement, Up/Z for left rotate, X for right rotate, Space to start/retry
- **MVP excludes**: Wall kick, ghost piece, hold, hard drop, sound

## Naming Conventions

| Target | Convention | Example |
|--------|------------|---------|
| Class files | PascalCase | `GameScene.ts` |
| Other files | camelCase | `constants.ts` |
| Classes | PascalCase | `Tetromino` |
| Constants | UPPER_SNAKE_CASE | `BOARD_WIDTH` |
| Methods/variables | camelCase | `checkCollision()` |
