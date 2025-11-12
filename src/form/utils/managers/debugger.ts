/* eslint-disable no-console */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

export interface DebuggerConfig {
  /** Global enable/disable (overrides all namespace settings) */
  enabled?: boolean;

  /** Minimum log level to display */
  minLevel?: LogLevel;

  /** Namespace patterns to enable (supports wildcards) */
  namespaces?: string[];

  /** Should we log state changes automatically? */
  logStateChanges?: boolean;

  /** Should we log event emissions automatically? */
  logEvents?: boolean;

  /** Should we include timestamps? */
  timestamps?: boolean;

  /** Should we include performance metrics? */
  performance?: boolean;
}

interface LogContext {
  namespace: string;
  level: LogLevel;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export class Debugger {
  private static instance: Debugger;
  private config: Required<DebuggerConfig>;
  private enabledNamespaces: Set<string>;
  private namespacePatterns: RegExp[];

  private constructor(config: DebuggerConfig = {}) {
    this.config = {
      enabled: false,
      minLevel: 'debug',
      namespaces: [],
      logStateChanges: false,
      logEvents: false,
      timestamps: true,
      performance: false,
      ...config,
    };

    this.enabledNamespaces = new Set(this.config.namespaces);
    this.namespacePatterns = this.buildPatterns(this.config.namespaces);
  }

  static getInstance(config?: DebuggerConfig): Debugger {
    if (!Debugger.instance) {
      Debugger.instance = new Debugger(config);
    } else if (config) {
      Debugger.instance.updateConfig(config);
    }
    return Debugger.instance;
  }

  /** Update configuration at runtime */
  updateConfig(config: Partial<DebuggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.namespaces) {
      this.enabledNamespaces = new Set(config.namespaces);
      this.namespacePatterns = this.buildPatterns(config.namespaces);
    }
  }

  /** Enable specific namespaces */
  enable(...namespaces: string[]): void {
    namespaces.forEach((ns) => this.enabledNamespaces.add(ns));
    this.namespacePatterns = this.buildPatterns(Array.from(this.enabledNamespaces));
  }

  /** Disable specific namespaces */
  disable(...namespaces: string[]): void {
    namespaces.forEach((ns) => this.enabledNamespaces.delete(ns));
    this.namespacePatterns = this.buildPatterns(Array.from(this.enabledNamespaces));
  }

  /** Check if namespace is enabled */
  private isNamespaceEnabled(namespace: string): boolean {
    if (!this.config.enabled) return false;
    if (this.enabledNamespaces.size === 0) return true; // No restrictions
    if (this.enabledNamespaces.has(namespace)) return true;

    // Check wildcard patterns
    return this.namespacePatterns.some((pattern) => pattern.test(namespace));
  }

  /** Build regex patterns from namespace wildcards */
  private buildPatterns(namespaces: string[]): RegExp[] {
    return namespaces
      .filter((ns) => ns.includes('*'))
      .map((ns) => new RegExp(`^${ns.replace(/\*/g, '.*')}$`));
  }

  /** Check if log level meets minimum threshold */
  private meetsLevel(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(this.config.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /** Core logging method */
  private log(context: LogContext, ...args: unknown[]): void {
    if (!this.isNamespaceEnabled(context.namespace)) return;
    if (!this.meetsLevel(context.level)) return;

    const prefix = this.buildPrefix(context);
    const consoleMethod = this.getConsoleMethod(context.level);

    consoleMethod(prefix, ...args, context.metadata || {});
  }

  /** Build log prefix */
  private buildPrefix(context: LogContext): string {
    const parts: string[] = [];

    if (this.config.timestamps) {
      const time = new Date(context.timestamp || Date.now()).toISOString().split('T')[1];
      parts.push(`[${time}]`);
    }

    parts.push(`[${context.namespace}]`);
    parts.push(`[${context.level.toUpperCase()}]`);

    return parts.join(' ');
  }

  /** Get appropriate console method */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'error':
        return console.error;
      case 'warn':
        return console.warn;
      case 'info':
        return console.info;
      case 'trace':
        return console.trace;
      default:
        return console.log;
    }
  }

  /** Public API - Debug level */
  debug(namespace: string, ...args: unknown[]): void {
    this.log({ namespace, level: 'debug', timestamp: Date.now() }, ...args);
  }

  /** Public API - Info level */
  info(namespace: string, ...args: unknown[]): void {
    this.log({ namespace, level: 'info', timestamp: Date.now() }, ...args);
  }

  /** Public API - Warn level */
  warn(namespace: string, ...args: unknown[]): void {
    this.log({ namespace, level: 'warn', timestamp: Date.now() }, ...args);
  }

  /** Public API - Error level */
  error(namespace: string, ...args: unknown[]): void {
    this.log({ namespace, level: 'error', timestamp: Date.now() }, ...args);
  }

  /** Public API - Trace level */
  trace(namespace: string, ...args: unknown[]): void {
    this.log({ namespace, level: 'trace', timestamp: Date.now() }, ...args);
  }

  /** Group logging */
  group(namespace: string, label: string, collapsed = true): void {
    if (!this.isNamespaceEnabled(namespace)) return;

    const prefix = this.buildPrefix({ namespace, level: 'debug', timestamp: Date.now() });
    if (collapsed) console.groupCollapsed(`${prefix} ${label}`);
    else console.group(`${prefix} ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  /** Performance timing */
  time(namespace: string, label: string): void {
    if (!this.config.performance || !this.isNamespaceEnabled(namespace)) return;
    console.time(`[${namespace}] ${label}`);
  }

  timeEnd(namespace: string, label: string): void {
    if (!this.config.performance || !this.isNamespaceEnabled(namespace)) return;
    console.timeEnd(`[${namespace}] ${label}`);
  }

  /** Table logging */
  table(namespace: string, data: unknown[], columns?: string[]): void {
    if (!this.isNamespaceEnabled(namespace)) return;
    const prefix = this.buildPrefix({ namespace, level: 'debug', timestamp: Date.now() });
    console.log(prefix);
    console.table(data, columns);
  }

  /** State change logging helper */
  logStateChange<T>(
    namespace: string,
    key: string,
    oldValue: T,
    newValue: T,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.logStateChanges) return;

    this.log(
      { namespace, level: 'debug', timestamp: Date.now(), metadata },
      `State Change: ${key}`,
      { old: oldValue, new: newValue }
    );
  }

  /** Event logging helper */
  logEvent(
    namespace: string,
    eventName: string,
    payload: unknown,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.logEvents) return;

    this.log(
      { namespace, level: 'debug', timestamp: Date.now(), metadata },
      `Event: ${eventName}`,
      payload
    );
  }
}
