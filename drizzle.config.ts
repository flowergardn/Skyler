import { type Config } from "drizzle-kit";

export default {
    schema: "./src/db/schema.ts",
    dialect: "sqlite"
} satisfies Config;
