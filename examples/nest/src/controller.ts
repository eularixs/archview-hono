import { UserService } from "./service.js";

// Local stand-ins for @nestjs/common decorators.
function Controller(_p?: string): ClassDecorator { return () => {}; }
function Get(_p?: string): MethodDecorator { return () => {}; }
function Post(_p?: string): MethodDecorator { return () => {}; }

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
