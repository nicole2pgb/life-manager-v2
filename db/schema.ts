import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  boolean,
  check,
  date,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

export const LIFE_AREAS = [
  "Career",
  "Fitness",
  "Health",
  "Learning",
  "Personal",
  "Finance",
] as const;
export const THEME_COLORS = ["Pink", "Purple", "Blue", "Green", "Red"] as const;
export const WEEK_STARTS = ["Monday", "Sunday"] as const;
export const RECURRENCE_TYPES = [
  "none",
  "daily",
  "weekdays",
  "times_per_week",
] as const;

export type LifeArea = (typeof LIFE_AREAS)[number];
export type ThemeColor = (typeof THEME_COLORS)[number];
export type WeekStart = (typeof WEEK_STARTS)[number];
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

const id = () => bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

// Email uniqueness is case-insensitive through the database's default
// utf8mb4 collation (utf8mb4_0900_ai_ci on MySQL 8).
export const users = mysqlTable(
  "users",
  {
    id: id(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const userSettings = mysqlTable("user_settings", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  themeColor: mysqlEnum("theme_color", THEME_COLORS).notNull().default("Pink"),
  weekStart: mysqlEnum("week_start", WEEK_STARTS).notNull().default("Monday"),
  dailyCheckInEnabled: boolean("daily_check_in_enabled").notNull().default(false),
  dailyCheckInTime: time("daily_check_in_time").notNull().default("09:00:00"),
  lifeAreas: json("life_areas")
    .$type<LifeArea[]>()
    .notNull()
    .default(sql`(JSON_ARRAY('Career','Fitness','Health','Learning','Personal','Finance'))`),
});

export const tasks = mysqlTable(
  "tasks",
  {
    id: id(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    notes: text("notes"),
    lifeArea: mysqlEnum("life_area", LIFE_AREAS).notNull(),
    // One-time tasks only: at most one of these is set (no date = both null).
    // Calendar dates, no time zone. Recurring tasks must never use them.
    scheduledDate: date("scheduled_date", { mode: "string" }),
    dueDate: date("due_date", { mode: "string" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("tasks_user_id_idx").on(t.userId),
    check("tasks_single_date_check", sql`${t.scheduledDate} IS NULL OR ${t.dueDate} IS NULL`),
  ],
);

// Exactly one rule per task (task_id is the primary key). One-time tasks
// have a rule of type "none". `weekdays` holds ISO weekday numbers
// (Monday = 1 ... Sunday = 7).
export const recurrenceRules = mysqlTable(
  "recurrence_rules",
  {
    taskId: bigint("task_id", { mode: "number", unsigned: true })
      .primaryKey()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", RECURRENCE_TYPES).notNull().default("none"),
    weekdays: json("weekdays").$type<number[]>(),
    timesPerWeek: tinyint("times_per_week", { unsigned: true }),
  },
  (t) => [
    check(
      "recurrence_rules_times_per_week_check",
      sql`(${t.type} = 'times_per_week' AND ${t.timesPerWeek} BETWEEN 1 AND 7) OR (${t.type} <> 'times_per_week' AND ${t.timesPerWeek} IS NULL)`,
    ),
    check(
      "recurrence_rules_weekdays_check",
      sql`(${t.type} = 'weekdays' AND ${t.weekdays} IS NOT NULL) OR (${t.type} <> 'weekdays' AND ${t.weekdays} IS NULL)`,
    ),
  ],
);

// `completed_on` is a calendar DATE (no time, no time zone).
export const taskCompletions = mysqlTable(
  "task_completions",
  {
    id: id(),
    taskId: bigint("task_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    completedOn: date("completed_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_completions_task_date_unique").on(t.taskId, t.completedOn)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type RecurrenceRule = typeof recurrenceRules.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;

// Only a SHA-256 hash of the session token is stored (hex, 64 chars); the raw
// token lives only in the user's cookie.
export const sessions = mysqlTable(
  "sessions",
  {
    id: id(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);
