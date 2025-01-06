import knex, { type Knex } from "knex";
import type { Image } from "./datamodule";

export class Database {
    database;
    $;
    constructor(config: unknown) {
        this.database = knex(config as Knex.Config);
        this.$ = this.database;
    }

    async init() {
        // don't forget to change \src\datamodule.d.ts
        if (!(await this.$.schema.hasTable("images"))) {
            await this.$.schema.createTable("images", (t) => {
                t.increments("id");
                t.string("name").unique();
                t.boolean("has_compressed");
                t.boolean("is_gif");
                t.binary("hash")
            });
        }
    }

    async addImages(image: Omit<Image,"id">) {
        return this.$("images").insert(image)
    }

    async updateImages(image:Partial<Image>&Pick<Image,"id"> ) {
        return this.$("images").where("id",image.id).update(image)
    }

    async getAllImages() {
        // todo use the name of columns inside of *
        return this.$("images").select(
            "*"
        );
    }
}
