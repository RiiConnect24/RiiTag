const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
const outpath = path.resolve(__dirname, "banner.png"); // debug variable

class Tag {
    constructor(user) {
        this.user = this.loadUser(user);
        this.overlay = this.loadOverlay(this.user.overlay);

        this.makeBanner();
    }

    loadUser(json_string) {
        return JSON.parse(json_string);
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
        var obj = this;
        // console.log(source);
        this.getImage(source).then(function(img) {
            obj.ctx.drawImage(img, x, y);
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
        await this.cacheGameCover(game, this.getGameRegion(game));
        await this.drawImage(path.resolve(dataFolder, "cache", `${game}.png`), this.covCurX, this.covCurY);
        console.log(game);
        this.covCurX += this.covIncX;
        this.covCurY += this.covIncY;
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
            await this.loadFont(font);
        }
    }

    loadOverlay(file) {
        var overlay = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "overlays", file)));
        
        this.covStartX = overlay.cover_start_x;
        this.covStartY = overlay.cover_start_y;
        this.covIncX = overlay.cover_increment_x;
        this.covIncY = overlay.cover_increment_y;
    
        this.covCurX = this.covStartX;
        this.covCurY = this.covStartY;
    
        return overlay;
    }

    async makeBanner() {
        await this.loadFonts();
        var i = 0;

        this.canvas = new Canvas.Canvas(this.overlay.width, this.overlay.height);
        this.ctx = this.canvas.getContext("2d");

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

        // flag icon
        await this.drawImage(path.resolve(dataFolder, "flags", `${this.user.region}.png`),
            this.overlay.flag.x,
            this.overlay.flag.y);

        // username text
        this.drawText(this.overlay.username.font_family,
            this.overlay.username.font_size,
            this.overlay.username.font_style,
            this.overlay.username.font_color,
            this.user.name,
            this.overlay.username.x,
            this.overlay.username.y)

        // friend code text
        this.drawText(this.overlay.friend_code.font_family,
            this.overlay.friend_code.font_size,
            this.overlay.friend_code.font_style,
            this.overlay.friend_code.font_color,
            this.user.friend_code,
            this.overlay.friend_code.x,
            this.overlay.friend_code.y);

        // game covers
        if (this.user.sort.toLowerCase() != "none") {
            for (var game of this.user.games) {
                if (i < this.overlay.max_covers) {
                    await this.drawGameCover(game);
                    i++;
                }
            }
        }

        this.savePNG(outpath, this.canvas);
    }
}

module.exports = Tag;