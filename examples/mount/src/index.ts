import { Hono } from "hono";
import { userRoutes } from "./users.js";
const api = new Hono();
api.route("/users", userRoutes);     // nested mount
const app = new Hono();
app.route("/api", api);
export default app;
