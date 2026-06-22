import { UserService } from "./service.js";
const svc = new UserService();
// unexported free helper — collapsed by default
function fetchUsers() { return svc.list(); }
export function listUsers() { return fetchUsers(); }
