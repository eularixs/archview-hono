import { Hono } from "hono";
import { listUsers } from "./handler.js";
const app = new Hono();
app.get("/users", (c) => listUsers() as never);
export default app;
