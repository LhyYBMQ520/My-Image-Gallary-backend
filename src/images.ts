import type { Database } from "./database";
import fs from "node:fs/promises";

export async function findImages(path: string, db: Database) {
    const isImage = (path: string) =>
        [".png", ".jpg", ".jpeg", ".gif", ".webp"].findIndex((suffixes) =>
            path.endsWith(suffixes),
        ) !== -1;
    const exist = (await db.getAllImages()).map(i => i.name)
    const images = (await fs.readdir(path, { withFileTypes: true })).filter(
        (file) => file.isFile() && isImage(file.name)
    ).map(i => i.name).filter(i => !exist.includes(i))
    for(const i of images){
        db.addImages(i)
    }
}
