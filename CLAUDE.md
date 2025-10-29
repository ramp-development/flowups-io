# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Motif is a TypeScript toolkit for building interactive, stateful components for Webflow projects. Built on Finsweet's developer starter template, it provides a robust component architecture with state management, event handling, and persistence.

The project is currently developing two parallel efforts:
1. **Core Toolkit** (`/src/lib/`) - Reusable component foundation library
2. **Multi-Step Form** (`/src/multi-step-form/`) - Client project using the toolkit

## Commands

### Development
```bash
pnpm dev          # Build + watch mode + local server at http://localhost:3000
pnpm build        # Production build to /dist
pnpm check        # TypeScript type checking (no emit)
```

### Code Quality
```bash
pnpm lint         # Run ESLint + Prettier checks
pnpm lint:fix     # Auto-fix ESLint issues
pnpm format       # Format all files with Prettier
```

### Testing
```bash
pnpm test         # Run Playwright tests
pnpm test:ui      # Run tests with UI mode
```

### Dependencies
```bash
pnpm update       # Interactive dependency update UI
```

**Note:** This project requires pnpm >= 10. Install with `npm i -g pnpm`.

## Architecture

### Core Component System (`/src/lib/`)

The toolkit provides a three-tier component hierarchy in `/src/lib/core/components/`:

1. **BaseComponent** - Foundation layer
   - DOM querying and element caching
   - Lifecycle management (init/destroy with hooks)
   - Safe DOM manipulation utilities
   - Component metadata and unique ID generation
   - Debug/warning/error logging

2. **InteractiveComponent** (extends BaseComponent)
   - Native DOM event handling with automatic cleanup
   - EventBus integration for cross-component communication
   - Event delegation for dynamic content
   - Custom event emission
   - Debounced event handlers
   - Async element waiting utilities

3. **StatefulComponent** (extends InteractiveComponent)
   - Type-safe local component state
   - State validation and transformation hooks
   - Automatic persistence (memory/localStorage/sessionStorage/cookies)
   - State change tracking and reactive updates
   - Batch state operations
   - Computed properties and watchers
   - State restoration on component init

### Core Systems

**EventBus** (`/src/lib/core/events/event-bus.ts`)
- Singleton pattern for app-wide event communication
- Type-safe event handling via `AppEventMap`
- Priority-based handler execution
- One-time and persistent subscriptions
- Sync and async event emission
- Max listener warnings and error handling

**StateManager** (`/src/lib/core/state/state-manager.ts`)
- Global state management with per-key configuration
- Automatic persistence with versioning
- State watchers and computed values
- Batch updates and import/export
- Integrates with EventBus for state:changed events

**StorageManager** (`/src/lib/core/storage/storage-manager.ts`)
- Unified interface for multiple storage backends
- Adapters: Memory, LocalStorage, SessionStorage, Cookies
- Cross-storage copy/move operations
- Automatic fallback on storage unavailability
- Storage statistics and availability checking

**PersistenceManager** (`/src/lib/core/storage/persistance-manager.ts`)
- Higher-level abstraction over StorageManager
- Namespace support for key organization
- Version management for data migrations
- Type-safe serialization/deserialization

### Path Aliases

The project uses TypeScript path aliases defined in `tsconfig.json`:
- `$lib/*` → `src/lib/*` (toolkit code)
- `$utils/*` → `src/utils/*` (utilities)

Always use path aliases instead of relative imports for cleaner code.

### Type System

All TypeScript types are centralized in `/src/lib/types/`:
- `core/` - Component interfaces and lifecycle types
- `events/` - EventBus types and AppEventMap
- `state/` - State management configuration types
- `storage/` - Storage adapter interfaces and options

## Build Configuration

The build system uses esbuild configured in `/bin/build.js`:

### Entry Points
Modify the `ENTRY_POINTS` array to build multiple files:
```javascript
const ENTRY_POINTS = [
  'src/index.ts',
  'src/home/index.ts',
  'src/contact/index.ts',
];
```

Each entry point will output to `/dist` with the same file structure.

### Development Server
Running `pnpm dev` starts a server at `http://localhost:3000` with:
- Live reloading enabled (configurable in build.js)
- Source maps for debugging
- Watch mode for automatic rebuilds

Import built files in Webflow:
```html
<script defer src="http://localhost:3000/index.js"></script>
```

### Production Build
`pnpm build` creates minified, production-ready files in `/dist` without source maps.

## Development Patterns

### Creating a New Component

Extend `StatefulComponent` for full functionality:

```typescript
import { StatefulComponent } from '$lib/core/components/stateful-component';

interface MyState {
  count: number;
  isActive: boolean;
}

class MyComponent extends StatefulComponent<MyState> {
  constructor(config) {
    super(config);

    // Configure state keys
    this.configureState({
      key: 'count',
      defaultValue: 0,
      storage: 'local',
      validate: (val) => typeof val === 'number',
    });
  }

  protected async setupEventListeners() {
    // Set up event listeners
    this.onClick('.my-button', this.handleClick);
  }

  protected handleStateChange(key, oldValue, newValue) {
    // React to state changes
  }

  private handleClick = () => {
    const count = this.getState('count');
    this.setState('count', count + 1);
  }
}
```

### Component Lifecycle

All components follow this lifecycle:
1. Constructor - Initialize configuration and state setup
2. `init()` - Called manually or via `autoInit: true` config
3. `onInit()` - Hook for setup (abstract method to implement)
4. Component is active
5. `destroy()` - Clean up resources
6. `onDestroy()` - Hook for cleanup (abstract method to implement)

**Important:** Always call `super.onInit()` and `super.onDestroy()` in child classes.

### Event Communication

Use EventBus for cross-component communication:

```typescript
// Component A - emit event
this.emit('user:login', { userId: 123 });

// Component B - subscribe to event
this.subscribe('user:login', (payload) => {
  console.log('User logged in:', payload.userId);
});
```

Define new events in `/src/lib/types/events/app-event-map.ts`.

### State Persistence

State automatically persists based on configuration:

```typescript
this.configureState({
  key: 'userData',
  storage: 'local',        // or 'session', 'cookie', 'memory'
  defaultValue: null,
  persistent: true,
  validate: (val) => val !== null,
  transform: (val) => processValue(val),
});
```

## Webflow Integration

The main entry point (`src/index.ts`) uses Webflow's ready callback:

```typescript
window.Webflow ||= [];
window.Webflow.push(() => {
  // Initialize components when Webflow is ready
  const element = document.querySelector('[data-component]');
  if (element) new MyComponent({ element });
});
```

This pattern ensures components initialize after Webflow's initialization.

## Testing

Playwright tests are in `/tests`. The dev server runs automatically during tests (configured in `playwright.config.ts`).

Tests can access localhost:3000 to test the built code in a browser environment.

## Code Quality

- **ESLint** uses Finsweet's configuration (`@finsweet/eslint-config`)
- **Prettier** for consistent formatting
- **TypeScript** strict mode enabled via `@finsweet/tsconfig`

The CI workflow runs lint and type checks on all PRs.

## Important Notes

- The project is in active development with uncommitted changes to multi-step form implementation
- `/src/lib/CLAUDE.md` contains detailed toolkit documentation - reference it for component architecture details
- Always prefer extending `StatefulComponent` for new components unless you need minimal functionality
- Use the singleton pattern for managers (EventBus, StateManager, StorageManager) - always call `getInstance()`
- Element caching is recommended for frequently accessed DOM nodes
