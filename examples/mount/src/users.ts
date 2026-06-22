import { Hono } from "hono";
import { UserService } from "./service.js";
const svc = new UserService();
export const userRoutes = new Hono();
userRoutes.get("/", (c) => svc.list() as never);
userRoutes.get("/:id", (c) => svc.get() as never);
