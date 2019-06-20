const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
const outpath = path.resolve(__dirname, "banner.png"); // debug variable

class Tag {
    canvas;
    ctx;

    overlay;
    user;

    covStartX;
    covStartY;
    covIncX;
    covIncY;

    covCurX;
    covCurY;

    banner;

    constructor(user) {
        this.user = this.loadUser(user);
        this.overlay = this.loadOverlay(this.user.overlay);

        this.loadFonts().then(function() {
            this.canvas = new Canvas.Canvas(overlay.width, overlay.height);
            this.ctx = this.canvas.getContext("2d");
            this.makeBanner();
        });
    }

    loadUser(file) {
        return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "debug", file)));
    }

    drawText(font, size, style, color, text, x, y) {
        console.log(`${style} ${size}px ${font}`);
        this.ctx.font = `${style} ${size}px ${font}`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, size + x, size + y);
    }

    async getImage(source) {
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

    async drawImage(source, x=0, y=0) {
        // console.log(source);
        this.getImage(source).then(function(img) {
            ctx.drawImage(img, x, y);
        }).catch(function(err) {
            console.error(err);
        });
    }

    getGameRegion(game) {
        var chars = game.split();
        var rc = chars[3];
        if (rc == "E") {
            return "US";
        } else if (rc == "P") {
            return "EN";
        } else if (rc == "J") {
            return "JA";
        } else {
            return "US";
        }
    }

    async cacheGameCover(game, region) {
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

    async drawGameCover(game) {
        await this.cacheGameCover(game, getGameRegion(game));
        await this.drawImage(path.resolve(dataFolder, "cache", `${game}.png`), covCurX, covCurY);
        console.log(game);
        covCurX += covIncX;
        covCurY += covIncY;
    }

    async savePNG(out, c) {
        return new Promise(function(resolve) {
            c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", function() {
                // console.log("File written");
                resolve();
            });
        });
    }

    async loadFont(file) {
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

    async loadFonts() {
        for (var font of fs.readdirSync(path.resolve(dataFolder, "fonts"))) {
            await loadFont(font);
        }
    }

    loadOverlay(file) {
        var overlay = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "overlays", file)));
        
        this.covStartX = overlay.cover_start_x;
        this.covStartY = overlay.cover_start_y;
        this.covIncX = overlay.cover_increment_x;
        this.covIncY = overlay.cover_increment_y;
    
        this.covCurX = covStartX;
        this.covCurY = covStartY;
    
        return overlay;
    }

    async makeBanner() {
        // background
        await this.drawImage(path.resolve(dataFolder, this.user.bg));

        // overlay image
        await this.drawImage(path.resolve(dataFolder, this.overlay.overlay_img));

        // coin image/text
        await this.drawImage(path.resolve(dataFolder, this.overlay.coin_icon.img),
            this.overlay.coin_icon.x,
            this.overlay.coin_icon.y);
        this.drawText(this.overlay.coin_count.font_family,
            this.overlay.coin_count.font_size,
            this.overlay.coin_count.font_style,
            this.overlay.coin_count.font_color,
            this.user.coins,
            this.overlay.coin_count.x,
            this.overlay.coin_count.y);
    }
}

module.exports = Tag;