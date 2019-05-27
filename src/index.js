const Canvas = require("canvas");
const Image = Canvas.Image;
const fs = require("fs");
const resolve = require("path").resolve;

const canvas = new Canvas.Canvas(1200, 450);
const ctx = canvas.getContext("2d");

const dataFolder = resolve(__dirname, "..", "data");
const bgURL = resolve(dataFolder, "overlay1.png"); // debug variable 
const bgColor = "#18B6ED";
const fgColor = "#FFFFFF";
const textColor = "#FFFFFF";
const outpath = resolve(__dirname, "banner.png"); // debug variable

const covIncX = 160/1.5;

const covStartX = 160/2
const covStartY = 110;

const games = ["RSPE01", "RPOEC8", "RB7E54", "RSNE69"]; // debug variable

var covCurX = covStartX;
var covCurY = covStartY;
Canvas.registerFont(resolve(dataFolder, "nintendou.ttf"), {
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
    img.height = 100;
    img.width = 100;
    img.onload = function() {
        // ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, covCurX, covCurY);
        covCurX += covIncX;
        console.log(`${covCurX}, ${covCurY}`);
        canvas.createPNGStream().pipe(fs.createWriteStream(outpath));
    }
    img.onerror = function(err) {
        console.error(err);
    }
    img.src = `https://art.gametdb.com/wii/cover3D/${region}/${game}.png`;
}

function drawFlag() {
    var img = new Image();
    img.src = resolve(dataFolder, "flags", "us.png");
    ctx.drawImage(img, 15, 10);
}

function drawBackground() {
    var img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    }
    img.onerror = function(err) {
        console.error(err);
        drawRect(bgColor, 0, 0, canvas.width, canvas.height);
    }
    img.src = bgURL;
}

drawBackground();
drawFlag();
// drawRect(fgColor, 0, 0, canvas.width, canvas.height/6);
drawText("rodin", 48, "normal", "bendevnull", 48, 14);

for (var game of games) {
    drawGameCover(game);
}