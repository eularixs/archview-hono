import { UserRepository } from "./repository.js";
export class UserController {
  constructor(private repo = new UserRepository()) {}
  // smell: controller reaches the repository directly, skipping the service.
  list() { return this.repo.findAll(); }
}
