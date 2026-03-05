# AGENTS.md - Development Guidelines for AI QA Comparison Tool

Guidelines for agentic coding assistants working on this Electron-based AI QA comparison tool.

## Project Overview

- **Type**: Electron app with React frontend, Express API, SQLite database, Puppeteer browser automation
- **Frontend**: React + TypeScript + Ant Design
- **Main Process**: Node.js CommonJS modules
- **Testing**: Playwright UI tests, Jest unit tests, custom test runner
- **Language**: Chinese comments, English variable names

## Build Commands

### Development
```bash
npm start              # Start dev server (renderer dev server + Electron)
npm run dev           # Same as start
npm run dev:renderer  # Start React dev server on port 3001
```

### Production Build
```bash
npm run build          # Build both renderer and main
npm run build:renderer # Build React app only
npm run build:main     # Build main process (placeholder)
npm run pack           # Package with electron-builder
npm run dist           # Create distribution packages
```

## Linting and Formatting

### ESLint Configuration
- Configuration: `.eslintrc.js`
- Extends: eslint:recommended, react/recommended, @typescript-eslint/recommended
- Key rules: `react/react-in-jsx-scope`: off, `@typescript-eslint/no-explicit-any`: warn

### Lint Commands
```bash
npm run lint           # Lint all source files in src/
```

### TypeScript Configuration
- Renderer: `src/renderer/tsconfig.json`
- Strict mode: enabled, JSX: react-jsx, Target: ES5

## Testing

### Test Structure
```
test/
├── run-tests.js              # Main test runner
├── browser-automation.test.js
├── answer-adapter.test.js
├── playwright/               # UI tests
│   ├── ui/                  # Component tests
│   ├── functional/          # Feature tests
│   └── automation/          # Browser automation tests
└── playwright.config.ts     # Playwright configuration
```

### Test Commands
```bash
npm test                     # Run all tests (custom test runner)
npx playwright test         # Run Playwright UI tests
npx playwright test --ui    # Run Playwright with UI mode
npx playwright test --project=chromium  # Specific browser
```

### Running Specific Tests
- Playwright: `npx playwright test test/playwright/ui/answer-comparison.spec.ts`
- Playwright with pattern: `npx playwright test -g "site management"`
- Custom test runner: `node test/run-tests.js`

### Test Environment
- Web server: `npm run dev` (port 3000)
- Browsers: Chromium, Firefox, WebKit
- Results: `test-results/` and `playwright-report/`

## Code Style Guidelines

### Import Conventions
- **TypeScript/React**: ES6 imports, group React libraries → third-party → local components → types
  ```typescript
  import React, { useState } from 'react';
  import { Layout, Card } from 'antd';
  import QuestionInput from './components/QuestionInput';
  import { AiSite } from '../types';
  ```
- **Main Process (CommonJS)**: Use `require()`, destructure class imports
  ```javascript
  const { app, BrowserWindow } = require('electron');
  const { DatabaseManager } = require('../shared/database');
  ```

### Naming Conventions
- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Interfaces/Types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Database fields**: `snake_case` (e.g., `input_selector`)
- **File names**: Components `PascalCase.tsx`, utilities `camelCase.js`, main process `kebab-case.js`

### TypeScript Guidelines
- Define interfaces in `src/renderer/src/types/index.ts`
- Use `interface` over `type` for object shapes
- Use `React.FC<Props>` with destructured props
- Extend global interfaces for Electron API in `types/index.ts`

### Error Handling
- Use async/await with try-catch blocks
- Log errors with descriptive messages, provide fallback behavior
- Throw errors with details in main process for IPC handlers

### React Component Patterns
- Use React hooks (`useState`, `useEffect`)
- Specify effect dependency arrays, clean up intervals/timeouts
- Early returns for loading/error states, ternary operators for conditional rendering

### Styling
- Use Ant Design components as primary UI
- Inline styles for simple adjustments, CSS classes via Ant Design className
- Avoid external CSS files

### Comments and Documentation
- Write comments in Chinese (项目使用中文注释)
- Use JSDoc for function documentation
- Comment complex business logic

## Development Notes

### Architecture
- **Project Structure**: Electron main process, React renderer, Express API, shared utilities
- **IPC Communication**: `ipcMain.handle` + `contextBridge` → `window.electronAPI`
- **Database**: MySQL with `DatabaseManager` class, tables: `ai_sites`, `qa_history`, `api_config`
  - Configuration via environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Uses connection pooling and automatic table creation
  - Supports UTF8mb4 character set for Chinese text
- **Browser Automation**: Puppeteer, configurable site selectors

### Development Workflow
1. Start dev: `npm start`
2. Run tests: `npm test` or Playwright tests
3. Lint: `npm run lint`
4. Build: `npm run build` then `npm run dist`

### Notes for AI Agents
- Chinese comments, English variable names
- Main process: CommonJS; renderer: ES6 modules
- Follow existing patterns, update types when changing data structures
- Test changes with appropriate test commands
- Ensure Electron API compatibility

### Troubleshooting
- **Electron API unavailable**: Check preload script, restart dev server
- **Database errors**: Ensure MySQL service running, check connection settings in .env file
- **Browser automation failures**: Update selectors, check network
- **TypeScript errors**: Run `npm run lint`
- **Debugging**: Terminal output (main), DevTools (renderer), Playwright reports