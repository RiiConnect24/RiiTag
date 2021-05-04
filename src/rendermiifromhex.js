const Canvas = require("canvas"),
      utils = require("./utils"),
      path = require("path");

const endpoint = "https://miicontestp.wii.rc24.xyz/cgi-bin/render.cgi?data=";

module.exports = async function(hex, id, dataFolder) {
    var c = new Canvas.Canvas(512, 512);
    var ctx = c.getContext("2d");
    var img;
    try {
        img = await utils.getImage(`${endpoint}${hex}`);
        ctx.drawImage(img, 0, 0, 512, 512);
        await utils.savePNG(path.join(dataFolder, "miis", id + ".png"), c);
    } catch(e) {
        console.error(e);
    }
}