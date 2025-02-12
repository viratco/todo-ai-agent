import { timestamp } from "drizzle-orm/mysql-core";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const todosTable = pgTable("todos", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    todo: text().notNull(),

});
