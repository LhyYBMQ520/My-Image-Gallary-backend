import type { Request } from "express";
export const parseUrl = (request: Request) =>
    new URL(`http://${process.env.HOST ?? "localhost"}${request.url}`);
