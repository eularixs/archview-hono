import { Node, SyntaxKind } from "ts-morph";
import type { Result } from "./analyzer.js";

// CQRS handler-class decorators (NestJS @CommandHandler(Cmd) and friends). The
// single decorator argument is the message type the class handles.
const CQRS_DECORATORS = new Set([
  "CommandHandler", "QueryHandler", "EventsHandler", "EventHandler", "Saga", "Handler",
]);
// Method on a handler class that runs the message.
const HANDLER_METHODS = ["execute", "handle", "run", "process", "on"];
// Method on a bus through which a message is dispatched.
const DISPATCH_METHODS = new Set([
  "execute", "dispatch", "send", "publish", "ask", "query", "emit", "run",
]);

/** A resolved mediator dispatch: caller sends Message, routed to concrete handlers. */
export interface Dispatch {
  caller: Node;
  message: string;
  handlers: Node[];
}

/**
 * detectBuses recovers command/query/event routing a static call graph cannot:
 * a handler class is bound to a message type by decorator, and the bus stores it
 * in a runtime map, so a plain call graph never connects dispatch to handler.
 * It learns message -> handler from @CommandHandler(Msg) classes, then resolves
 * dispatch sites (bus.execute(new Msg())) to the concrete handler method.
 */
export function detectBuses(res: Result): Dispatch[] {
  const routing = new Map<string, Node[]>(); // message type name -> handler method nodes

  for (const sf of res.sourceFiles) {
    for (const cls of sf.getClasses()) {
      for (const dec of cls.getDecorators()) {
        if (!CQRS_DECORATORS.has(dec.getName())) continue;
        const arg = dec.getArguments()[0];
        if (!arg) continue;
        const msg = arg.getText();
        let method: Node | undefined;
        for (const name of HANDLER_METHODS) {
          const m = cls.getMethod(name);
          if (m && res.funcs.has(m)) { method = m; break; }
        }
        if (!method) continue;
        (routing.get(msg) ?? routing.set(msg, []).get(msg)!).push(method);
      }
    }
  }
  if (routing.size === 0) return [];

  const dispatches: Dispatch[] = [];
  for (const [fnNode] of res.funcs) {
    const body = (fnNode as any).getBody?.();
    if (!body) continue;
    for (const call of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (!Node.isPropertyAccessExpression(expr) || !DISPATCH_METHODS.has(expr.getName())) continue;
      const a0 = call.getArguments()[0];
      if (!a0 || !Node.isNewExpression(a0)) continue;
      const msg = a0.getExpression().getText();
      const handlers = routing.get(msg);
      if (handlers) dispatches.push({ caller: fnNode, message: msg, handlers });
    }
  }
  return dispatches;
}
