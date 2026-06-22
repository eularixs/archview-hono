import { UserRepository } from "./repository.js";
export class UserService {
  constructor(private repo = new UserRepository()) {}
  list() { return this.repo.findAll(); }
  create(name: string) { return this.repo.insert(name); }
}
