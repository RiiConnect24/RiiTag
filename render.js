// This is a simple script for rendering default Miis (/data/miis/guests)

const Canvas = require("canvas");

const utils = require("./src/utils");

const fs = require("fs");
const MiiUtils = require("./src/miiutil");
const path = require('path');

const folder = path.join(__dirname, "data", "miis", "guests");

(async function() {
    for (const file of fs.readdirSync(folder)) {
        if (file.endsWith(".mii") || file.endsWith(".rcd")) {
            fs.unlinkSync(folder + "/" + file);
        }
    }
})();