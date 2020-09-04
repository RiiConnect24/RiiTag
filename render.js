// This is a simple script for rendering default Miis (/data/miis/guests)

const Canvas = require("canvas");

const utils = require("./src/utils");

const fs = require("fs");
const MiiUtils = require("./src/miiutil");
const path = require('path');

const folder = path.join(__dirname, "data", "miis", "guests");

(async function() {
    for (const file of fs.readdirSync(folder)) {
        if (!file.endsWith(".rcd")) {
            continue;
        }

        const canvas = new Canvas.Canvas(512, 512);
        const ctx = canvas.getContext("2d");
        const url = MiiUtils.getWiiMiiRenderURL(path.join(folder, file));
        const id = file.replace(".rcd", "");

        var img;

        img = await utils.getImage(url);
        ctx.drawImage(img, 0, 0, 512, 512);
        await utils.savePNG(path.join(folder, `${id}.png`), canvas);
    }
})();