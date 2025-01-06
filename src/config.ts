import { z } from "zod";

export const configSchema = z.object({
    // only for better schema file support,
    // todo: but if we sure we will only use toml as config file, we can removw it
    $schema: z.string().optional(),
    network: z.object({
        port: z.number().default(3000),
    }),
    app: z.object({
        image_folder: z.string(),
        compressed_images_folder: z.string(),
        log: z
            .object({
                file: z.string().default(""),
                level: z.number().default(0),
            })
            .default({}),
    }),
    // just use the raw type of knex, it is difficult to provide support schame cheak of it.
    // maybe we can provide some just for schema file. This can help to provide a better config editing experience.
    database: z
        .object({
            // the support list of knex.
            client: z.enum([
                "pg",
                "pg-native",
                "sqlite3",
                "better-sqlite3",
                "mysql",
                "mysql2",
                "oracledb",
                "tedious",
            ]),
        })
        .and(z.record(z.string(), z.unknown())),
});

export type Config = z.infer<typeof configSchema>;
export const Config = {
    parse: (object: object) => configSchema.parse(object),
};
