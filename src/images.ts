import crypto from "node:crypto";
import type { Database } from "./database";
import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";
import sharp from "sharp";

const dirent2str = (dirent: Dirent) =>
    path.join(dirent.parentPath, dirent.name);

/**
 * find new image
 * @param source the dir to find image
 * @param db the app‘s database
 * @returns the Promise of the database wirte task
 */
export async function findImages(source: string, db: Database) {
    const isImage = (path: string) =>
        [".png", ".jpg", ".jpeg", ".gif", ".webp"].findIndex((suffixes) =>
            path.endsWith(suffixes),
        ) !== -1;
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
    // to find the image wich are not in the database, and get the key of the exists image
    return Promise.all(
        [...Map.groupBy(images, (i) => exists.indexOf(i[0]))].map(
            async ([index, i]) => {
                if (index >= 0) {
                    for (const [name, hash] of i) {
                        if (!allImages[index].hash.equals(hash)) {
                            console.log(`image ${name} has been changed`);
                            await db.updateImages({
                                id: allImages[index].id,
                                hash: hash,
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
                    const buf2hex = (buffer: Buffer) =>
                        [...new Uint8Array(buffer)]
                            .map((x) => x.toString(16).padStart(2, "0"))
                            .join("");

                    for (const [name, hash] of checkedImage.get(false) ?? []) {
                        console.log(
                            `the hash of ${name} [${buf2hex(hash)}] already exit`,
                        );
                    }
                }
            },
        ),
    );
}

/**
 * @returns all the image comperss task
 */
export async function compressImage(
    source: string,
    target: string,
    db: Database,
) {
    const isStiticImage = (path: string) =>
        [".png", ".jpg", ".jpeg", ".webp"].findIndex((suffixes) =>
            path.endsWith(suffixes),
        ) !== -1;
    const images = (await db.getAllImages())
        .filter((i) => isStiticImage(i.name))
        .filter((i) => !i.has_compressed);
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
