export interface Options {
  /** Project directory to analyze (tsconfig root). Defaults to ".". */
  root?: string;
  /** Mount path for the UI. Defaults to "/graph". */
  basePath?: string;
  /** Click-to-source scheme: "vscode" | "cursor". Defaults to "vscode". */
  editor?: string;
  /** Surface outbound interface ports. */
  showPorts?: boolean;
  /** Recover mediator/CQRS routing. */
  detectBuses?: boolean;
  /** Turn off chain-based auto-layer (on by default). */
  disableAutoLayer?: boolean;
  /** Flag architecture smells on call edges. */
  lintLayers?: boolean;
  /** Keep trivial helper functions as nodes. */
  showHelpers?: boolean;
}

export interface ResolvedOptions extends Required<Omit<Options, "showPorts" | "detectBuses" | "disableAutoLayer" | "lintLayers" | "showHelpers">> {
  showPorts: boolean;
  detectBuses: boolean;
  autoLayer: boolean;
  lintLayers: boolean;
  showHelpers: boolean;
}

export function resolve(opts: Options): ResolvedOptions {
  return {
    root: opts.root ?? ".",
    basePath: "/" + (opts.basePath ?? "/graph").replace(/^\/+|\/+$/g, ""),
    editor: opts.editor ?? "vscode",
    showPorts: opts.showPorts ?? false,
    detectBuses: opts.detectBuses ?? false,
    autoLayer: !(opts.disableAutoLayer ?? false),
    lintLayers: opts.lintLayers ?? false,
    showHelpers: opts.showHelpers ?? false,
  };
}
