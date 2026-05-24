// ─── localStorage fallback mock ───────────────────────────────────────────────
// Every Prisma call returns a safe empty default so the app can run using
// localStorage data without requiring a PostgreSQL database.
//
// Add a real DATABASE_URL to .env.local, run `npx prisma generate && npx prisma db push`,
// then swap the export below to use the real PrismaClient.

function makeModelMock() {
  const noop = async () => null;
  return {
    findMany: async () => [],
    findFirst: noop,
    findUnique: noop,
    create: async (args) => ({ id: `mock_${Date.now()}`, ...args?.data }),
    update: async (args) => ({ id: args?.where?.id ?? "mock", ...args?.data }),
    upsert: async (args) => ({
      id: args?.where?.id ?? `mock_${Date.now()}`,
      ...args?.create,
    }),
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
    updateMany: async () => ({ count: 0 }),
    count: async () => 0,
    aggregate: async () => ({
      _sum: {},
      _count: 0,
      _avg: {},
      _min: {},
      _max: {},
    }),
    groupBy: async () => [],
  };
}

// A Proxy so that prisma.anyModel.anyMethod() always works
const dbMock = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === "$transaction") {
        return async (fnOrArray) => {
          if (typeof fnOrArray === "function") return fnOrArray(dbMock);
          return Promise.all(fnOrArray);
        };
      }
      if (prop === "$connect" || prop === "$disconnect") return async () => {};
      if (prop === "$on" || prop === "$use") return () => {};
      // Any model access (prisma.user, prisma.store, etc.)
      return makeModelMock();
    },
  },
);

console.warn(
  "\n[Manzili] 🗄️  Using localStorage data layer (no database).\n" +
    "Set DATABASE_URL in .env.local and run `npx prisma generate && npx prisma db push` to enable PostgreSQL.\n",
);

export const prisma = dbMock;
