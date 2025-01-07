import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import morgen from "morgan";
import toml from "smol-toml";
import { Config } from "./config";
import { Database } from "./database";
import { compressImage, findImages, startWatchImageDir } from "./images";
import { parseUrl } from "./unit";

import chokidar from "chokidar";

process.chdir(process.env.APP_HOME || ".app");
const config = Config.parse(
    toml.parse(await fs.readFile("./config.toml", { encoding: "utf-8" })),
);
// init here to prevent it call event add on exits file.
// todo but we might can rebuild holl image tarking system on it
const watcher = chokidar.watch("." /*config.app.image_folder*/, {
    awaitWriteFinish: true,
    usePolling: false,
    cwd: config.app.image_folder,
});

console.time("database");
const database = new Database(config.database);
await database.init();
console.timeEnd("database");
console.time("image");
await findImages(config.app.image_folder, database);
await compressImage(
    config.app.image_folder,
    config.app.compressed_images_folder,
    database,
);
console.timeEnd("image");
const app = express();

app.use(morgen("dev"));

app.get("/api/images", async (req, res) => {
    const images = await database.getAllImages();
    const url = parseUrl(req);
    // todo need a better way to parse them
    const page = Number.parseInt(url.searchParams.get("page") as string) || 1;
    const perPage =
        Number.parseInt(url.searchParams.get("perPage") as string) || 20;

    if (images.length < perPage) {
        res.json(images);
        return;
    }
    res.json(images.slice((page - 1) * perPage, page * perPage));
});

app.get("/api/rawimage/:name", async (req, res) => {
    res.sendFile(
        path.join(process.cwd(), config.app.image_folder, req.params.name),
    );
});

app.get("/api/compressed/:name", async (req, res) => {
    res.sendFile(
        path.join(
            process.cwd(),
            config.app.compressed_images_folder,
            req.params.name,
        ),
    );
});

app.listen(config.network.port, () => {
    console.log(`Started server at: http://localhost:${config.network.port}`);
});

startWatchImageDir(
    watcher,
    config.app.image_folder,
    config.app.compressed_images_folder,
    database,
);
