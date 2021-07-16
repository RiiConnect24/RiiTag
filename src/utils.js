const fs = require("fs");
const Canvas = require("canvas");
const Image = Canvas.Image;

async function savePNG(out, c) {
    return new Promise(function(resolve, reject) {
        var t;
        c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", function() {
            clearTimeout(t);
            resolve();
        });

        t = setTimeout(() => {
            console.log(out + " - savePNG Timed Out");
            reject();
        }, 7500);
    });
}

async function getImage(source) {
    var img = new Image();
    return new Promise(function(resolve, reject) {
        var t;
        img.onload = function() {
            clearTimeout(t);
            resolve(img);
        }
        img.onerror = function(err) {
            clearTimeout(t);
            reject(err);
        }
        t = setTimeout(() => {
            console.log(source + " - getImage Timed Out");
            reject();
        }, 7500);
        console.log(source);
        img.src = source;
    });
}

module.exports = {
    savePNG,
    getImage,
}