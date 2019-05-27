const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
const outpath = path.resolve(__dirname, "banner.png"); // debug variable

const games = ["RSPE01", "RPOEC8", "RB7E54", "RSNE69"]; // debug variable

const canvas = new Canvas.Canvas(1200, 450);
const ctx = canvas.getContext("2d");

var covStartX;
var covStartY;
var covIncX;
var covIncY;

var covCurX;
var covCurY;

function loadOverlay(file) {
    var overlay = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "overlays", file)));
    
    covStartX = overlay.cover_start_x;
    covStartY = overlay.cover_start_y;
    covIncX = overlay.cover_increment_x;
    covIncY = overlay.cover_increment_y;

    covCurX = covStartX;
    covCurY = covStartY;

    return overlay;
}

function loadUser(file) {
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "debug", file)));
}

function drawText(font, size, style, color, text, x, y) {
    ctx.font = `${style} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.fillText(text, size + x, size + y);
}

async function drawImage(source, x=0, y=0) {
    var img = new Image();
    return new Promise(function(resolve, reject) {
        img.onload = function() {
            resolve(img);
        }
        img.onerror = function(err) {
            reject(err);
        }
        img.src = source;
    }).then(function() {
        ctx.drawImage(img, x, y);
    }).catch(function(err) {
        console.error(err);
    });
}

async function cacheGameCover(game, region="US") {
    var can = new Canvas.Canvas(176, 248);
    var con = can.getContext("2d");
    var img = new Image()
}

async function drawGameCover(game, region="US") {
    await drawImage(`https://art.gametdb.com/wii/cover3D/${region}/${game}.png`, covCurX, covCurY);
    console.log(game);
    covCurX += covIncX;
    covCurY += covIncY;
}

function savePNG(out) {
    canvas.createPNGStream().pipe(fs.createWriteStream(out));
}

var user = loadUser("user1.json");
var overlay = loadOverlay(user.overlay);

// console.log(overlay);
async function main() {
    await drawImage(path.resolve(dataFolder, user.bg));
    await drawImage(path.resolve(dataFolder, overlay.overlay_img));
    await drawImage(path.resolve(dataFolder, overlay.coin_icon.img),
        overlay.coin_icon.x,
        overlay.coin_icon.y);
    drawText(overlay.username.font_family,
        overlay.username.font_size,
        overlay.username.font_style,
        overlay.username.font_color,
        user.name,
        overlay.username.x,
        overlay.username.y);
    for (var game of user.games) {
        await drawGameCover(game);
    }
    savePNG(outpath);
}

main();