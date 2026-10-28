import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResets = sqliteTable(
  "password_resets",
  {
    /** SHA-256 of the emailed token. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
);

export const pets = sqliteTable(
  "pets",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["snake", "tarantula", "jumping_spider", "lizard", "amphibian", "other"] }).notNull(),
    species: text("species"),
    sex: text("sex", { enum: ["male", "female", "unknown"] })
      .notNull()
      .default("unknown"),
    birthDate: text("birth_date"),
    lengthCm: real("length_cm"),
    weightG: real("weight_g"),
    feedingIntervalDays: integer("feeding_interval_days").notNull().default(7),
    avatarKey: text("avatar_key"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("pets_user_idx").on(t.userId)],
);

export const photos = sqliteTable(
  "photos",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    caption: text("caption"),
    createdAt: createdAt(),
  },
  (t) => [index("photos_pet_idx").on(t.petId)],
);

export const feedings = sqliteTable(
  "feedings",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    fedAt: integer("fed_at", { mode: "timestamp_ms" }).notNull(),
    preyType: text("prey_type").notNull(),
    preySize: text("prey_size"),
    preyState: text("prey_state", { enum: ["live", "frozen_thawed", "pre_killed"] }),
    quantity: integer("quantity").notNull().default(1),
    accepted: integer("accepted", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("feedings_pet_idx").on(t.petId, t.fedAt)],
);

export const measurements = sqliteTable(
  "measurements",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    measuredAt: integer("measured_at", { mode: "timestamp_ms" }).notNull(),
    lengthCm: real("length_cm"),
    weightG: real("weight_g"),
    createdAt: createdAt(),
  },
  (t) => [index("measurements_pet_idx").on(t.petId, t.measuredAt)],
);

export type CheckupResult = {
  status: "great" | "watch" | "concern";
  summary: string;
  observations: string[];
  tips: string[];
  vetRecommended: boolean;
};

export const checkups = sqliteTable(
  "checkups",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    photoKey: text("photo_key"),
    question: text("question"),
    result: text("result", { mode: "json" }).$type<CheckupResult>().notNull(),
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("checkups_pet_idx").on(t.petId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Feeding = typeof feedings.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type Checkup = typeof checkups.$inferSelect;
