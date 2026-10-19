import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

export type Bindings = Env & { GEMINI_API_KEY?: string; GEMINI_KEY?: string };

export type AppEnv = {
  Bindings: Bindings;
  Variables: { user: Pick<schema.User, "id" | "email" | "name"> };
};

export const db = (env: Bindings) => drizzle(env.DB, { schema });
