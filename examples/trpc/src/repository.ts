export class UserRepository {
  findAll() { return [{ id: 1 }]; }
  insert(name: string) { return { id: 2, name }; }
}
