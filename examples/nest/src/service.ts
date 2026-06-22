import { UserRepository } from "./repository.js";
export class UserService {
  constructor(private repo = new UserRepository()) {}
  findAll() { return this.repo.all(); }
  create(n: string) { return this.repo.add(n); }
}
