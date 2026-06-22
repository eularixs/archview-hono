import { Hono } from "hono";
import { UserController } from "./controller.js";
const ctl = new UserController();
const app = new Hono();
app.get("/users", (c) => ctl.list() as never);
export default app;
