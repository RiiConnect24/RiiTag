const Canvas = require("canvas"),
    Image = Canvas.Image,
    fs = require("fs"),
    path = require("path"),
    dataFolder = path.resolve(__dirname, "..", "data"),
    outpath = path.resolve(__dirname, "banner.max.png");
    outpath_small = path.resolve(__dirname, "banner.png");

var canvas,
    ctx,
    covStartX,
    covStartY,
    covIncX,
    covIncY,
    covShrink,
    covCurX,
    covCurY,
    covShrinkCurWidth,
    covShrinkCurHeight;

loadFonts().then(() => {
    console.log("Finished");
    canvas = new Canvas.Canvas(1200, 450);
    ctx = canvas.getContext("2d");
    main();
});

/**
 * Load an overlay from a JSON and return it.
 */
function loadOverlay(file) 
{
    var overlay = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "overlays", file)));
    
    covStartX = overlay.cover_start_x;
    covStartY = overlay.cover_start_y;
    covIncX = overlay.cover_increment_x;
    covIncY = overlay.cover_increment_y;
    covShrink = overlay.cover_increment_shrink;

    covCurX = covStartX;
    covCurY = covStartY;
    covShrinkCurWidth = overlay.cover_width;
    covShrinkCurHeight = overlay.cover_height;

    return overlay;
}

/**
 * Pull a user from the database using their key and return it.
 * @argument {string} key The key of the user you wish to request. 
 * @returns The requested user.
 */
function loadUser(key) 
{
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "debug", key)));
}

/**
 * Draw a piece of text using provided information.
 * @argument {string} font The font-family to draw from.
 * @argument {int} size The font-size of the draw.
 * @argument {string} style The CSS-style information for the text.
 * @argument {string} color The HEX color in which to write the text in.
 * @argument {int} x The X position to write to.
 * @argument {int} y The Y position to write to. 
 */
function drawText(font, size, style, color, text, x, y) 
{
    console.log(`${style} ${size}px ${font}`);
    ctx.font = `${style} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.fillText(text, size + x, size + y);
}

/**
 * Fetch a request image from a source URL.
 * @argument {string} source The Source URL.
 */
async function getImage(source) 
{
    var img = new Image();
    
    return new Promise((resolve, reject) => {
        img.onload = () => {
            resolve(img);
        }
        img.src = source;
        img.onerror = (err) => {
            img.src = "https://raw.githubusercontent.com/bennyman123abc/rc24-tag/master/data/img/nocover.png";
        }
    });
}

/**
 * Draw an image from a source.
 * @argument {string} source The image source URL.
 * @argument {int} x The X to draw to.
 * @argument {int} y The Y to draw to.
*/
async function drawImage(source, x=0, y=0) {
    // console.log(source);

    getImage(source).then((img) => {
        ctx.drawImage(img, x, y);
    })
    .catch((err) => {
        console.error(err);
    });
}

/**
 * Draw an image, but shrinked.
 * @argument {string} source The image source.
 * @argument {int} x The x position to draw to.
 * @argument {int} y The y position to draw to.
 * @argument {int} shrinkx The distance on the x-axis to shrink.
 * @argument {int} shrinky The distance on the y-axis to shrink.
 */
async function drawImageShrink(source, x=0, y=0, shrinkx=0, shrinky=0) {
    // console.log(source);
    getImage(source).then((img) => {
        ctx.drawImage(img, x, y, shrinkx, shrinky);
    })
    .catch((err) => {
        console.error(err);
    });
}

/**
 * Return a game's full functional region based on provided string.
 * @argument {string} game The unconverted region string.
 * @returns {string} The converted region string.
 */
function getGameRegion(game) {
    switch (game[3]) {
        case "E":
            return "US";

        case "P":
            return "EN";

        case "J":
            return "JA";

        case "K":
            return "KO";
    }
}

/**
 * Cache the game's cover.
 * @argument {string} game The game's name.
 * @argument {string} region The game's region.
 */
async function cacheGameCover(game, region) {
    if (!fs.existsSync(path.resolve(dataFolder, "cache")))
        fs.mkdirSync(path.resolve(dataFolder, "cache"));

    if (!fs.existsSync(path.resolve(dataFolder, `cache/${region}`)))
        fs.mkdirSync(path.resolve(dataFolder, `cache/${region}`));

    if (fs.existsSync(path.resolve(dataFolder, `cache/${region}`, `${game}.png`)))
        return;    

    var can = new Canvas.Canvas(176, 248);
    var con = can.getContext("2d");
    var img = await getImage(`https://art.gametdb.com/wii/cover3D/${region}/${game}.png`);

    con.drawImage(img, 0, 0, 176, 248);

    await savePNG(path.resolve(dataFolder, "cache", `${game}.png`), can);
}

/**
 * Draw the game's cover.
 * @argument {string} game The game to pull the cover from.
 * @argument {string} region The region of the cover to pull.
 */
async function drawGameCover(game, region="US") {
    await cacheGameCover(game, getGameRegion(game));

    covShrinkCurWidth -= covShrink;
    covShrinkCurHeight -= Math.round(covShrink * 1.409);

    console.log(covShrinkCurWidth);
    console.log(covShrinkCurHeight);
    
    if (covShrink == 0) {
        await drawImage(path.resolve(dataFolder, `cache/${region}`, `${game}.png`), covCurX, covCurY);
    }
    else if (covShrink > 0) {
        await drawImageShrink(path.resolve(dataFolder, `cache/${region}`, `${game}.png`), covCurX, covCurY, covShrinkCurWidth, covShrinkCurHeight);
    }

    console.log(game);
    covCurX += covIncX;
    covCurY += covIncY;
}

/**
 * Save the PNG to the server's file-system.
 * @argument {string} out The name of the file to write to.
 * @argument {Image} c The image to write to the file.
 */
async function savePNG(out, c) {
    return new Promise((resolve) => {
        c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", () => {
            resolve();
        });
    });
}

/**
 * Load a font from the file.
 * @argument {string} file The path to the font's file.
 */
async function loadFont(file) {
    var font = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "fonts", file)));
    
    return new Promise((resolve) => {
        for (var style of font.styles) {
            Canvas.registerFont(path.resolve(dataFolder, "fontfiles", style.file), {
                family: font.family,
                weight: style.weight,
                style: style.style
            });

            console.log("Loaded font");
            resolve();
        }
    });
}

/**
 * Load of the font's within the "fonts" folder.
 */
async function loadFonts() {
    for (var font of fs.readdirSync(path.resolve(dataFolder, "fonts"))) {
        await loadFont(font);
    }
}

var user = loadUser("user1.json"),
    overlay = loadOverlay(user.overlay);

// console.log(overlay);
async function main() {
    var i = 0;

    await drawImage(path.resolve(dataFolder, user.bg));
    await drawImage(path.resolve(dataFolder, overlay.overlay_img));
    await drawImage(path.resolve(dataFolder, overlay.coin_icon.img), overlay.coin_icon.x, overlay.coin_icon.y);
    await drawImage(path.resolve(dataFolder, "flags", `${user.region}.png`), overlay.flag.x, overlay.flag.y);
    
    drawText(overlay.username.font_family, overlay.username.font_size, overlay.username.font_style, overlay.username.font_color, user.name, overlay.username.x, overlay.username.y);
    drawText(overlay.coin_count.font_family, overlay.coin_count.font_size, overlay.coin_count.font_style, overlay.coin_count.font_color, user.coins, overlay.coin_count.x, overlay.coin_count.y);
    drawText(overlay.friend_code.font_family, overlay.friend_code.font_size, overlay.friend_code.font_style, overlay.friend_code.font_color, user.friend_code, overlay.friend_code.x, overlay.friend_code.y);

    if (user.sort.toLowerCase() != "none") {
        for (var game of user.games.reverse().slice(overlay.max_covers * -1)) {
            if (i < overlay.max_covers) {    
                await drawGameCover(game);
                i++;
            }
        }
    }

    savePNG(outpath, canvas);

    canvas = new Canvas.Canvas(400, 150);
    ctx = canvas.getContext("2d");
    await drawImageShrink(outpath, 0, 0, 800, 300);
    savePNG(outpath_small, canvas);
}
