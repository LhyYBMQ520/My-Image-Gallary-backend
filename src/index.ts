import express from "express";
import morgen from "morgan";
import { Config } from "./config";
import toml from "smol-toml";
import fs from "node:fs/promises";
import { parseUrl } from "./unit";
import { Database } from "./database";
import { findImages } from "./images";

process.chdir(process.env.APP_HOME || ".app");
const config = Config.parse(
    toml.parse(await fs.readFile("./config.toml", { encoding: "utf-8" })),
);

const database = new Database(config.database);
await database.init()

await findImages(config.app.image_folder,database);

const app = express();

app.use(morgen("dev"));

app.get("/api/images",async (req, res) => {
    const images = await database.getAllImages()
    const url = parseUrl(req);
    // todo need a better way to parse them
    const page = Number.parseInt(url.searchParams.get("page") || "1") || 1
    const perPage = Number.parseInt(url.searchParams.get("perPage") || "20") || 20;

    if (images.length < perPage) {res.json(images);return}
    res.json(images.slice((page-1)*perPage,page*perPage))
});

app.listen(config.network.port, () => {
    console.log(`Started server at: http://localhost:${config.network.port}`);
});
