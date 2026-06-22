import { CreateUserCommand } from "./commands.js";

interface CommandBus { execute(c: unknown): unknown; }

export class UserController {
  constructor(private bus: CommandBus) {}
  create(name: string) {
    return this.bus.execute(new CreateUserCommand(name));
  }
}
