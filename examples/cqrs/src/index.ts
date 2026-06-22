import { Hono } from "hono";
import { UserController } from "./controller.js";

const ctl = new UserController({ execute: (c) => c });
const app = new Hono();
app.post("/users", (c) => ctl.create("x") as never);
export default app;
