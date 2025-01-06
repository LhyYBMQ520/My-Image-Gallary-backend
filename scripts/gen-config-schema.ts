import fs from "node:fs/promises";
import { zodToJsonSchema } from "zod-to-json-schema";
import { configSchema } from "../src/config";

await fs.writeFile(
    "./config.schema.json",
    JSON.stringify(zodToJsonSchema(configSchema), null, 2),
);
