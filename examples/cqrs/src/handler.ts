import { CreateUserCommand } from "./commands.js";
import { UserRepo } from "./repo.js";

// Local stand-in for @nestjs/cqrs' decorator; ts-morph reads the syntax.
function CommandHandler(_cmd: unknown): ClassDecorator {
  return () => {};
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  constructor(private repo: UserRepo) {}
  execute(cmd: CreateUserCommand) {
    return this.repo.save(cmd.name);
  }
}
