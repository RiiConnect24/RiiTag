const fs = require("fs");
const MiiUtil = require("./miiutil");
const path = require("path");

module.exports = function(folder) {
    for (var file of fs.readdirSync(folder)) {
        console.log(MiiUtil.getWiiMiiRenderURL(path.join(folder, file)));
    }
}