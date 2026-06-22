import type { UserRepository, User } from "./repository.js";
export class UserService {
  constructor(private repo: UserRepository) {}
  list(): User[] { return this.repo.findAll(); }
  add(name: string): User { return this.repo.create(name); }
}
