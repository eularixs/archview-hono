export interface User { id: number; name: string; }
export interface UserRepository { findAll(): User[]; create(name: string): User; }
export class userRepository implements UserRepository {
  private rows: User[] = [{ id: 1, name: "Ada" }];
  private next = 2;
  findAll(): User[] { return this.rows; }
  create(name: string): User { const u = { id: this.next++, name }; this.rows.push(u); return u; }
}
