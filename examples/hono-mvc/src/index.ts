import { Hono } from "hono";
import { UserController } from "./user/controller.js";
import { UserService } from "./user/service.js";
import { userRepository } from "./user/repository.js";

const ctl = new UserController(new UserService(new userRepository()));
const app = new Hono();
app.get("/users", (c) => ctl.list(c));
app.post("/users", (c) => ctl.create(c));
export default app;
