import knex, { type Knex } from "knex";

export class Database {
    database;
    $;
    constructor(config: unknown) {
        this.database = knex(config as Knex.Config);
        this.$ = this.database;
    }

    async init() {
        if (!(await this.$.schema.hasTable("images"))) {
            await this.$.schema.createTable("images", (t) => {
                t.increments("id");
                t.string("name").unique();
                t.boolean("has_compressed");
            });
        }
    }
    async addImages(image: string) {
        return this.$("images").insert({ name: image, has_compressed: false });
    }
    async getAllImages() {
        return this.$("images").select("id", "name");
    }
}
