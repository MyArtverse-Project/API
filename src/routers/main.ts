import { Router, Request, Response } from "express";
const router = Router();

import { setDefaultResponseHeaders } from "../middleware/headers";

router.get("/", setDefaultResponseHeaders, async (req: Request, res: Response) => {
    return res.json({
        "ok": true,
        "connectionStatus": {
            "db": "0ms"
        }
    })
});

router.get("/health", setDefaultResponseHeaders, async (req: Request, res: Response) => {
    return res.send("If you're seeing this, then you're a curious person. Internal docker healthcheck.");
});

export default router;