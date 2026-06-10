// ======================================================
//                   MyFurverse API
// ======================================================
import * as LoggerClass from "./tools/logger";
const _logger = new LoggerClass.Logger("MyArtverse-API");

import express from "express";


// Router Import
import MainRouter from "./routers/main";


const app = express();

app.use("/", MainRouter);

app.listen(process.env["APP_PORT"] || 3000, (error) => {
    // Would like to make logging process "prettier". - Moz
    // _logger.start();
    _logger.info(`Process started on port ${process.env["APP_PORT"] || 3000}.`);
});