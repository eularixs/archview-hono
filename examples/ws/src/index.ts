import { Hono } from "hono";
function upgradeWebSocket(fn: unknown) { return fn as never; }

const app = new Hono();
function chatHandler() { return { onMessage() {} }; }

app.get("/ws", upgradeWebSocket(() => chatHandler()));
app.get("/health", (c) => c.text("ok"));
export default app;
