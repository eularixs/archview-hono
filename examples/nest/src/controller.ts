import { UserService } from "./service.js";

// Local stand-ins for @nestjs/common decorators.
const Controller = (_p?: string): any => () => {};
const Get = (_p?: string): any => () => {};
const Post = (_p?: string): any => () => {};

@Controller("users")
export class UserController {
  constructor(private svc = new UserService()) {}
  @Get()
  list() { return this.svc.findAll(); }
  @Get(":id")
  get() { return this.svc.findAll(); }
  @Post()
  create() { return this.svc.create("x"); }
}
