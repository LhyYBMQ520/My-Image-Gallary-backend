import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import morgen from "morgan";
import toml from "smol-toml";
import { Config } from "./config";
import { Database } from "./database";
import {
    compressImage,
    findImages,
    removeAllUselessCompressed,
    startWatchImageDir,
} from "./images";
import { parseUrl } from "./unit";

import chokidar from "chokidar";
import type { Image } from "./datamodule";

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
await removeAllUselessCompressed(config.app.compressed_images_folder, database);
await compressImage(
    config.app.image_folder,
    config.app.compressed_images_folder,
    database,
);
console.timeEnd("image");
const app = express();
morgen.token("status-c", (req, res) => {
    const status = res.statusCode;

    // get status color
    const color =
        status >= 500
            ? 31 // red
            : status >= 400
              ? 33 // yellow
              : status >= 300
                ? 36 // cyan
                : status >= 200
                  ? 32 // green
                  : 0; // no color
    return `\x1b[${color}m${status}\x1b[0m`;
});

// @ts-expect-error ip shoule be here
morgen.token("ip",(req, res) => req.ip)

app.use(morgen("[:date[iso]] :method :ip - :req[host] :url - :status-c :response-time ms"));

app.get("/api/images", async (req, res) => {
    const hash2base64 = (image:Image) => ({...image,hash:image.hash.toString("hex")});
    const images = await database.getAllImages();
    const url = parseUrl(req);
    // todo need a better way to parse them
    const page = Number.parseInt(url.searchParams.get("page") as string) || 1;
    const perPage =
        Number.parseInt(url.searchParams.get("perPage") as string) || 20;

    if (images.length < perPage) {
        res.json(images.map(hash2base64));
        return;
    }
    res.json(images.slice((page - 1) * perPage, page * perPage).map(hash2base64));
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
