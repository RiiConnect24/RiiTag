const fs = require("fs");
const Canvas = require("canvas");
const Image = Canvas.Image;

async function savePNG(out, c) {
    return new Promise(function(resolve) {
        c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", function() {
            resolve();
        });
    });
}

async function getImage(source) {
    var img = new Image();
    return new Promise(function(resolve, reject) {
        img.onload = function() {
            resolve(img);
        }
        img.onerror = function(err) {
            reject(err);
        }
        console.log(source);
        img.src = source;
    });
}

module.exports = {
    savePNG,
    getImage,
}