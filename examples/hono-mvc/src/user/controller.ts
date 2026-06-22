import type { Context } from "hono";
import type { UserService } from "./service.js";
export class UserController {
  constructor(private svc: UserService) {}
  list(c: Context) { return c.json(this.svc.list()); }
  create(c: Context) { return c.json(this.svc.add("new")); }
}
