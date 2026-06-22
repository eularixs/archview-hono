// Graph model — identical JSON schema to archview (Go).
export type NodeKind = "endpoint" | "func" | "port";
export type EdgeKind = "route" | "call" | "implements" | "dispatch";

export interface Node {
  id: string;
  kind: NodeKind;
  label: string;
  layer: string;
  module: string;
  pkg?: string;
  func?: string;
  file?: string;
  line?: number;
  editorURL?: string;
  method?: string;
  path?: string;
}

export interface Edge {
  from: string;
  to: string;
  kind: EdgeKind;
  violation?: string;
}

export interface Graph {
  module: string;
  nodes: Node[];
  edges: Edge[];
}

export const LAYER_ORDER = ["endpoint", "controller", "service", "port", "repository", "other"] as const;

// editorURL builds a deep link opening file:line:col in vscode/cursor.
export function editorURL(scheme: string, absFile: string, line: number, col: number): string {
  if (scheme !== "vscode" && scheme !== "cursor") return "";
  const esc = absFile.split("/").map(encodeURIComponent).join("/");
  return `${scheme}://file/${esc}:${line}:${col}`;
}
