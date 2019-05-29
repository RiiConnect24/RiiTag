const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
const outpath = path.resolve(__dirname, "banner.png"); // debug variable

const games = ["RSPE01", "RPOEC8", "RB7E54", "RSNE69"]; // debug variable

var canvas;
var ctx;

var covStartX;
var covStartY;
var covIncX;
var covIncY;

var covCurX;
var covCurY;

loadFonts().then(function() {
    console.log("Finished");
    canvas = new Canvas.Canvas(1200, 450);
    ctx = canvas.getContext("2d");
    main();
});

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
    console.log(`${style} ${size}px ${font}`);
    ctx.font = `${style} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.fillText(text, size + x, size + y);
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
        img.src = source;
    });
}

async function drawImage(source, x=0, y=0) {
    // console.log(source);
    getImage(source).then(function(img) {
        ctx.drawImage(img, x, y);
    }).catch(function(err) {
        console.error(err);
    });
}

async function cacheGameCover(game, region) {
    if (!fs.existsSync(path.resolve(dataFolder, "cache"))) {
        fs.mkdirSync(path.resolve(dataFolder, "cache"));
    }
    if (fs.existsSync(path.resolve(dataFolder, "cache", `${game}.png`))) {
        return;
    }
    var can = new Canvas.Canvas(176, 248);
    var con = can.getContext("2d");
    var img = await getImage(`https://art.gametdb.com/wii/cover3D/${region}/${game}.png`);
    con.drawImage(img, 0, 0, 176, 248);
    await savePNG(path.resolve(dataFolder, "cache", `${game}.png`), can);
}

async function drawGameCover(game, region="US") {
    if (user.sort.toLowerCase() == "none") {
        return;
    }
    await cacheGameCover(game, region);
    await drawImage(path.resolve(dataFolder, "cache", `${game}.png`), covCurX, covCurY);
    console.log(game);
    covCurX += covIncX;
    covCurY += covIncY;
}

async function savePNG(out, c) {
    return new Promise(function(resolve) {
        c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", function() {
            // console.log("File written");
            resolve();
        });
    });
}

async function loadFont(file) {
    var font = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "fonts", file)));
    
    return new Promise(function(resolve) {
        for (var style of font.styles) {
            Canvas.registerFont(path.resolve(dataFolder, "fontfiles", style.file),
                {
                    family: font.family,
                    weight: style.weight,
                    style: style.style
                }
            );
            console.log("Loaded font");
            resolve();
        }
    });
}

async function loadFonts() {
    for (var font of fs.readdirSync(path.resolve(dataFolder, "fonts"))) {
        await loadFont(font);
    }
}

var user = loadUser("user1.json");
var overlay = loadOverlay(user.overlay);

// console.log(overlay);
async function main() {
    var i = 0;
    await drawImage(path.resolve(dataFolder, user.bg));
    await drawImage(path.resolve(dataFolder, overlay.overlay_img));
    await drawImage(path.resolve(dataFolder, overlay.coin_icon.img),
        overlay.coin_icon.x,
        overlay.coin_icon.y);
    await drawImage(path.resolve(dataFolder, "flags", `${user.region}.png`),
        overlay.flag.x,
        overlay.flag.y);
    drawText(overlay.username.font_family,
        overlay.username.font_size,
        overlay.username.font_style,
        overlay.username.font_color,
        user.name,
        overlay.username.x,
        overlay.username.y);
    drawText(overlay.coin_count.font_family,
        overlay.coin_count.font_size,
        overlay.coin_count.font_style,
        overlay.coin_count.font_color,
        user.coins,
        overlay.coin_count.x,
        overlay.coin_count.y);
    drawText(overlay.friend_code.font_family,
        overlay.friend_code.font_size,
        overlay.friend_code.font_style,
        overlay.friend_code.font_color,
        user.friend_code,
        overlay.friend_code.x,
        overlay.friend_code.y);
    for (var game of user.games) {
        if (i < overlay.max_covers) {    
            await drawGameCover(game);
            i++;
        }
    }
    savePNG(outpath, canvas);
}
