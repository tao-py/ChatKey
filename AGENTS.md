# AGENTS.md - Development Guidelines for AI问答对比工具

This document provides guidelines for agentic coding agents working on this repository.

## Overview

Electron desktop app for comparing answers from multiple AI platforms:
- **Frontend**: React + TypeScript + Ant Design (`src/renderer/`)
- **Main Process**: Electron + Node.js (`src/main/`)
- **Shared Modules**: SQLite database (`src/shared/`)
- **API Server**: Express.js (`src/api/`)

## Build Commands

### Root Package Scripts
```bash
npm run dev          # Start dev environment (React + Electron)
npm run build        # Build renderer and main processes
npm run build:renderer # Build React renderer only
npm run build:main   # Build main process (placeholder)
npm run pack         # Package with electron-builder
npm run dist         # Create distribution packages
```

### Renderer (React) Scripts
```bash
cd src/renderer
npm start            # Start React dev server
npm run build        # Build React app
npm test             # Run React tests
npm run eject        # Eject from react-scripts (not recommended)
```

## Lint Commands

```bash
npm run lint                  # Run ESLint on all source files
npx eslint src/ --fix         # Auto-fix linting issues
cd src/renderer && npx tsc --noEmit  # TypeScript type checking
```

ESLint config (`.eslintrc.js`) key rules:
- `react/react-in-jsx-scope`: off (React 17+)
- `@typescript-eslint/no-explicit-any`: warn (avoid `any` types)
- `@typescript-eslint/explicit-module-boundary-types`: off

## Test Commands

```bash
npm test                     # Run all Jest tests (if any)
npm test -- --watch          # Watch mode
npm test -- path/to/testfile.test.js  # Single test file
npm test -- --coverage       # Coverage report
```

**Note**: No test files exist yet. When adding tests:
- Place test files next to source with `.test.js` or `.test.tsx` suffix
- Use Jest as test runner (configured via package.json)
- For React component testing, use React Testing Library

## Code Style Guidelines

### Imports
1. React imports
2. Third-party libraries (antd, axios, etc.)
3. Absolute imports (if configured)
4. Relative imports (components, utils, types)
5. CSS/SCSS imports

Example: `import React, { useState } from 'react'; import { Layout } from 'antd'; import QuestionInput from './components/QuestionInput';`

### Formatting
- 2-space indentation, no tabs
- Semicolons required
- Single quotes for strings
- Max line length: 100 chars (soft limit)
- Trailing commas in multi-line objects/arrays
- Braces on same line (K&R style)

### TypeScript
- Strict mode enabled (tsconfig.json)
- Prefer explicit types for function returns and public APIs
- Avoid `any`; use `unknown` or specific interfaces
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Define interfaces in `src/renderer/src/types/`

Example: `interface Props { onSubmit: (question: string) => Promise<void>; loading: boolean; }`

### Naming Conventions
- **Variables/constants**: camelCase (`aiSites`, `isLoading`)
- **Functions**: camelCase (`handleQuestionSubmit`, `loadAiSites`)
- **Components**: PascalCase (`QuestionInput`, `AnswerComparison`)
- **Interfaces/Types**: PascalCase (`AiSite`, `QaRecord`)
- **Classes**: PascalCase (`DatabaseManager`, `ElectronApp`)
- **Files**: PascalCase for components, camelCase for utilities
- **Database columns**: snake_case (matching existing schema)

### Error Handling
- Use try/catch for async operations
- Log errors with `console.error` in development
- Provide user-friendly error messages in UI
- Don't swallow errors silently

Example: `try { const sites = await window.electronAPI.getAiSites(); } catch (error) { console.error('加载失败:', error); }`

### Comments
- Use Chinese comments for business logic (existing convention)
- Use English comments for technical explanations
- JSDoc for public functions/APIs
- Focus on "why" not "what"

Example: `// 开发环境加载React开发服务器，生产环境加载构建后的文件`

## Framework Conventions

### React
- Functional components with hooks
- Ant Design components where possible
- State: `useState` for local, `useEffect` for side effects

### Electron
- Main process: `src/main/` with CommonJS (`require()`)
- Preload script exposes APIs via `contextBridge`
- IPC for communication between main and renderer processes

### Database (SQLite)
- Parameterized queries to prevent SQL injection
- JSON serialize/deserialize for complex data
- Tables: `IF NOT EXISTS`, include `created_at`/`updated_at`

### API Server (Express)
- REST conventions, `/v1/` prefix
- Middleware for authentication (API key), CORS, parsing
- Validate input data, return consistent JSON responses

## Testing

- **Unit tests**: Test pure functions, mock external dependencies
- **Component tests**: Use React Testing Library, mock Electron APIs
- **Integration tests**: Test API endpoints with supertest
- **Test structure**: Use Jest's `describe`/`it` pattern

## Commit Messages

- Use conventional commit messages (feat, fix, chore, docs, style, refactor, test)
- Write descriptive messages in Chinese or English
- Reference issue numbers if applicable
- Keep commits focused and atomic

Examples: `feat: 添加网站管理功能`, `fix: 修复API配置保存问题`, `chore: 更新依赖包版本`