const Canvas = require("canvas");
const Image = Canvas.Image;
const fs = require("fs");
const resolve = require("path").resolve;

const canvas = new Canvas.Canvas(1200, 450);
const ctx = canvas.getContext("2d");

const bgURL = `https://picsum.photos/id/142/${canvas.width}/${canvas.height}`; // debug variable 
const bgColor = "#18B6ED";
const fgColor = "#FFFFFF";
const textColor = "#000000";
const outpath = resolve(__dirname, "banner.png"); // debug variable
const dataFolder = resolve(__dirname, "..", "data");

const covIncX = 160/2;

const covStartX = 160 * 2
const covStartY = canvas.height/3;

const games = ["RSPE01"]; // debug variable

var covCurX = covIncX;
var covCurY = covStartY;
console.log(resolve(dataFolder, "font.ttf"));
Canvas.registerFont(resolve(dataFolder, "font.ttf"), {
    family: "nintendou"
});

function drawRect(color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawText(font, size, style, text, x, y) {
    ctx.font = `${style} ${size}px ${font}`;
    ctx.fillStyle = textColor;
    ctx.fillText(text, size + x, size + y);
}

function drawGameCover(game, region="US") {
    var img = new Image();
    img.onload = function() {
        ctx.drawImage(img, covCurX, covCurY);
        covCurX += covIncX;
        canvas.createPNGStream().pipe(fs.createWriteStream(outpath));
    }
    img.onerror = function(err) {
        console.error(err);
    }
    img.src = `https://art.gametdb.com/wii/cover/${region}/${game}.png`;
}

drawRect(bgColor, 0, 0, canvas.width, canvas.height);
drawRect(fgColor, 0, 0, canvas.width, canvas.height/6);
drawText("nintendou", 45, "bold", "User", 5, 5);

for (var game of games) {
    drawGameCover(game);
}