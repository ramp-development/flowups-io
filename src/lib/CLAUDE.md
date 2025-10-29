# Motif Lib - Webflow Component Toolkit

## Overview
This is a foundational toolkit for building interactive, stateful components in Webflow. It provides a robust architecture for managing component lifecycle, state, events, and storage.

## Architecture

### Core Component Hierarchy
1. **BaseComponent** - Foundation class providing:
   - DOM element querying and caching
   - Lifecycle management (init/destroy)
   - Safe element manipulation utilities
   - Component metadata tracking
   - Debug/error logging

2. **InteractiveComponent** (extends BaseComponent) - Adds:
   - Event handling with automatic cleanup
   - EventBus integration for decoupled communication
   - Event delegation for dynamic content
   - DOM and custom event emission
   - Debounced event handlers

3. **StatefulComponent** (extends InteractiveComponent) - Adds:
   - Local component state management
   - State validation and transformation
   - State persistence (memory/local/session/cookie)
   - State change tracking and reactions
   - Batch state updates
   - Computed properties and watchers

### Core Systems

#### Event System
- **EventBus** - Singleton event bus with:
  - Type-safe event handling
  - Priority-based handler execution
  - One-time and persistent subscriptions
  - Async event emission
  - Max listener warnings
  - Error handling with custom handlers

#### State Management
- **StateManager** - Global state manager with:
  - Centralized state storage
  - Per-key configuration (persistence, defaults, storage type)
  - State watchers and computed values
  - Batch updates
  - Import/export capabilities
  - Automatic persistence restoration

#### Storage System
- **StorageManager** - Unified storage interface supporting:
  - Memory storage (in-memory)
  - Local storage (persistent)
  - Session storage (session-scoped)
  - Cookie storage (with expiry)
  - Storage adapter pattern for extensibility

- **PersistenceManager** - Higher-level persistence with:
  - Versioning support
  - Namespace management
  - Type-safe serialization
  - Migration support (structure in place)

### Type System
Located in `/types`, providing TypeScript definitions for:
- Component lifecycle and configuration
- Event bus types and event maps
- State management types
- Storage adapter interfaces
- Component metadata and errors

### Constants
Pre-defined constants for:
- Accessibility attributes
- Event names
- Storage keys
- Validation patterns

## Key Features

### Component Features
- Automatic initialization with `autoInit` config
- Element caching for performance
- Safe element manipulation (text, HTML, attributes)
- Built-in visibility and class toggling
- Unique ID generation
- Metadata tracking (init/destroy times)

### Event Features
- Type-safe event system
- Automatic listener cleanup
- Event delegation support
- Custom event emission
- Debounced handlers
- EventBus subscriptions
- Priority-based execution

### State Features
- Local and global state management
- State validation before updates
- State transformation on set
- Automatic persistence
- Change tracking
- Computed properties
- State watchers
- Batch updates
- Reset to initial values

### Storage Features
- Multiple storage backends
- Consistent API across all storage types
- Automatic fallback (e.g., memory if localStorage unavailable)
- Cross-storage copying/moving
- Storage statistics
- Namespace support

## Usage Pattern
```typescript
class MyComponent extends StatefulComponent<MyState> {
  constructor(config) {
    super(config);

    // Configure state
    this.configureState({
      key: 'count',
      defaultValue: 0,
      storage: 'local',
      validate: (val) => typeof val === 'number'
    });
  }

  protected async setupEventListeners() {
    this.onClick('.button', this.handleClick);
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

## Design Principles
- **Lifecycle Safety**: Proper init/destroy with cleanup
- **Type Safety**: Full TypeScript support
- **Decoupling**: EventBus for cross-component communication
- **Persistence**: State survives page reloads
- **Performance**: Element caching, debouncing
- **Extensibility**: Abstract classes, adapter patterns
- **Error Handling**: Comprehensive error catching and logging
- **Developer Experience**: Debug mode, metadata, warnings

## Next Steps
This toolkit is designed to be the foundation for building:
- Multi-step forms
- Interactive wizards
- Data-driven components
- Stateful UI elements
- Complex Webflow interactions
