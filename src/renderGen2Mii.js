const Canvas = require("canvas");
const utils = require("./utils");
const path = require("path");

var options = {}

module.exports = async function (data, id, dataFolder) {

    const endpoint = "https://studio.mii.nintendo.com/miis/image.png?data=";
    const epargs = "&amp;type=face&amp;width=512&amp;bgColor=FFFFFF00";

    var c = new Canvas.Canvas(512, 512);
    var ctx = c.getContext("2d");
    var img;
    try {
        img = await utils.getImage(`${endpoint}${data}${epargs}`);
        ctx.drawImage(img, 0, 0, 512, 512);
        await utils.savePNG(path.join(dataFolder, "miis", id + ".png"), c);
    } catch (e) {
        console.error(e);
    }
}

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}