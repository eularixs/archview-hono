import { UserService } from "./service.js";

// Minimal stand-in for the tRPC builder; ts-morph reads the call shape.
const t = {
  procedure: {
    query<T>(fn: () => T) { return { _query: fn }; },
    mutation<T>(fn: () => T) { return { _mutation: fn }; },
  },
};
function router<T>(routes: T) { return routes; }

const svc = new UserService();

export const appRouter = router({
  listUsers: t.procedure.query(() => svc.list()),
  createUser: t.procedure.mutation(() => svc.create("x")),
});
