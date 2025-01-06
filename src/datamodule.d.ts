// biome-ignore lint/correctness/noUnusedImports: This file is needed to let TypeScript make a correct infer.
import { Knex } from "knex";

interface Image {
    id: number;
    name: string;
    has_compressed: boolean;
    is_gif: boolean;
    hash: Buffer;
}

declare module "knex/types/tables" {
    interface Tables {
        images: Image;
    }
}
