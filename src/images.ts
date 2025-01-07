import crypto from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { FSWatcher } from "chokidar";
import sharp from "sharp";
import type { Database } from "./database";

const dirent2str = (dirent: Dirent) =>
    path.join(dirent.parentPath, dirent.name);

export const isImage = (path: string) =>
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].findIndex((suffixes) =>
        path.endsWith(suffixes),
    ) !== -1;

const buf2hex = (buffer: Buffer) =>
    [...new Uint8Array(buffer)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");

/**
 * find new image
 * @param source the dir to find image
 * @param db the app‘s database
 * @returns the Promise of the database wirte task
 */
export async function findImages(source: string, db: Database) {
    const allImages = (await db.getAllImages()).sort((a, b) => a.id - b.id);
    const exists = allImages.map((i) => i.name);

    const images = await Promise.all(
        (await fs.readdir(source, { withFileTypes: true }))
            .filter((file) => file.isFile() && isImage(file.name))
            .map(async (i) => {
                const hash = crypto.createHash("sha256");
                hash.update(await fs.readFile(dirent2str(i)));
                return [i.name, hash.digest()] as const;
            }),
    );
    const removed = exists.filter(
        (i) => images.map((i) => i[0]).indexOf(i) === -1,
    );
    // to find the image wich are not in the database, and get the key of the exists image
    return Promise.all([
        ...[...Map.groupBy(images, (i) => exists.indexOf(i[0]))].map(
            async ([index, i]) => {
                if (index >= 0) {
                    for (const [name, hash] of i) {
                        if (!allImages[index].hash.equals(hash)) {
                            console.log(`image ${name} has been changed`);
                            await db.updateImages({
                                id: allImages[index].id,
                                hash: hash,
                                has_compressed: false,
                            });
                        }
                    }
                } else {
                    const hashs = (await db.$("images").select("hash")).map(
                        (i) => i.hash,
                    );
                    const checkedImage = Map.groupBy(
                        i,
                        (i) =>
                            hashs.findIndex((hash) => hash.equals(i[1])) === -1,
                    );
                    for (const [name, hash] of checkedImage.get(true) ?? []) {
                        await db.addImages({
                            name: name,
                            has_compressed: false,
                            is_gif: name.endsWith(".gif"),
                            hash: hash,
                        });
                    }

                    for (const [name, hash] of checkedImage.get(false) ?? []) {
                        console.log(
                            `the hash of ${name} [${buf2hex(hash)}] already exit`,
                        );
                    }
                }
            },
        ),
        ...removed.map(async (removed) => {
            await db.$("images").where("name", removed).delete();
            console.warn(
                `image ${removed} is not in ${source}. The record of id was removed from the database`,
            );
        }),
    ]);
}

/**
 * @returns all the image comperss task
 */
export async function compressImage(
    source: string,
    target: string,
    db: Database,
) {
    const images = await db
        .$("images")
        .where("has_compressed", false)
        .where("is_gif", false);
    const tasks = images.map(async (image) => {
        await sharp(path.join(source, image.name))
            .resize(300)
            .webp()
            .toFile(path.join(target, `${image.name}.webp`));
        await db
            .$("images")
            .where("name", image.name)
            .update({ has_compressed: true });
    });
    return Promise.all(tasks);
}

export function startWatchImageDir(
    watcher: FSWatcher,
    source: string,
    comperssedTo: string,
    db: Database,
) {
    watcher.on("add", async (file) => {
        const hash = crypto
            .createHash("sha256")
            .update(await fs.readFile(path.join(source, file)))
            .digest();
        const hashs = (await db.$("images").select("hash")).map((i) => i.hash);
        if (hashs.findIndex((i) => i.equals(hash)) === -1) {
            await db.addImages({
                name: file,
                has_compressed: false,
                is_gif: file.endsWith(".gif"),
                hash: hash,
            });
            console.log(`imagr add ${file}`);
        } else {
            console.log(`the hash of ${file}} [${buf2hex(hash)}] already exit`);
        }
        compressImage(source, comperssedTo, db);
    });
    watcher.on("unlink", async (file) => {
        if ((await db.$("images").where("name", file)).length === 1) {
            await db.$("images").where("name", file).delete();
            console.warn(
                `image ${file} is not in ${source}. The record of id was removed from the database`,
            );
        }
    });
    watcher.on("change", async (file) => {
        const hash = crypto
            .createHash("sha256")
            .update(await fs.readFile(path.join(source, file)))
            .digest();
        const record = await db.$("images").where("name", file);
        // I think the record[0] shuold have value, but I'm not sure of it
        if (!record[0].hash.equals(hash)) {
            console.log(`image ${file} has been changed`);
            await db.updateImages({
                id: record[0].id,
                hash: hash,
                has_compressed: false,
            });
        }
        compressImage(source, comperssedTo, db);
    });
}
