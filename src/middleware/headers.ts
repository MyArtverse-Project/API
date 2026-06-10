import { Request, Response, NextFunction } from "express";
import { version } from "../../package.json";

export function setDefaultResponseHeaders(req: Request, res: Response, next: NextFunction) {
    res.set("X-Application-Version", version);

    next();
}