
const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");
const events = require("events");

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
// const outpath = path.resolve(__dirname, "banner.png"); // debug variable

class Tag extends events.EventEmitter{
    constructor(user, size) {
        super();

        this.size = size;
        this.user = this.loadUser(user);
        this.overlay = this.loadOverlay(this.user.overlay);

        this.makeBanner();
    }

    loadUser(json_string) {
        return JSON.parse(json_string);
    }

    drawText(font, size, style, color, text, x, y) {
        // console.log(`${style} ${size}px ${font}`);
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
            console.log(source);
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

    async drawImageShrink(source, x=0, y=0, shrinkx=0, shrinky=0) {
        var obj = this;
        console.log(source);
        obj.ctx.drawImage(source, x, y, shrinkx, shrinky);
    }

    getGameRegion(game) {
        var chars = game.split("");
        var rc = chars[3];
        if (rc == "P") {
            if (this.user.coverregion) {
                if (this.user.coverregion.toUpperCase().length == 2) { // region names are 2 characters as you can see
                    return this.user.coverregion.toUpperCase();
                }
            } else {
                return "EN";
            }
        } else if (rc == "E") {
            return "US";
        } else if (rc == "J") {
            return "JA";
        } else if (rc == "K") {
            return "KO";
        } else if (rc == "W") {
            return "TW";
        } else {
            return "EN";
        }
    }

    getConsoleType(game) {
        var chars = game.split("");
        var code = chars[0];
        if (game.startsWith("wii-")) {
            return "wii";
        } else if (game.startsWith("wiiu-")) {
            return "wiiu";
        } else if (code == "R" || code == "S") {
            return "wii";
        } else if (code == "A" || code == "B") {
            return "wiiu";
        } else {
            return "wii";
        }
    }

    getExtension(covertype, consoletype) {
        if (consoletype == "wii") {
            return "png";
        } else if (consoletype == "wiiu" && covertype == "cover") {
            return "jpg";
        } else {
            return "png";
        }
    }

    getCoverType()
    {
        if (this.user.covertype) {
            return this.user.covertype;
        } else {
            return "cover3D";
        }
    }

    getCoverWidth(covertype)
    {
        if (covertype == "cover3D") {
            return 176;
        } else if (covertype == "cover") {
            return 160;
        } else if (covertype == "disc") {
            return 160;
        } else {
            return 176;
        }
    }

    getCoverHeight(covertype)
    {
        if (covertype == "cover3D") {
            return 248;
        } else if (covertype == "cover") {
            return 224;
        } else if (covertype == "disc") {
            return 160;
        } else {
            return 248;
        }
    }

    getNoCover(covertype, consoletype)
    {
        if (covertype == "cover3D") {
            return "nocover.png";
        } else if (covertype == "cover") {
            return "nocoverFlat.png";
        } else if (covertype == "disc") {
            return "nodisc.png";
        } else {
            return "nocover.png";
        }
    }

    async downloadGameCover(game, region, covertype, consoletype, extension) {
        var can = new Canvas.Canvas(this.getCoverWidth(covertype), this.getCoverHeight(covertype));
        var con = can.getContext("2d");
        var img;

        img = await this.getImage(`https://art.gametdb.com/${consoletype}/${covertype}/${region}/${game}.${extension}`);
        con.drawImage(img, 0, 0, this.getCoverWidth(covertype), this.getCoverHeight(covertype));
        await this.savePNG(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`), can);
    }

    async cacheGameCover(game, region, covertype, consoletype, extension) {
        if (!fs.existsSync(path.resolve(dataFolder, "cache"))) {
            fs.mkdirSync(path.resolve(dataFolder, "cache"));
        }
        if (fs.existsSync(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`))) {
            return true;
        }
        try {
            await this.downloadGameCover(game, region, covertype, consoletype, extension);
        } catch(e) {
            try {
                await this.downloadGameCover(game, "EN", covertype, consoletype, extension); // cover might not exist?
            } catch(e) {
                try {
                    await this.downloadGameCover(game, "US", covertype, consoletype, extension); // small chance it's US region
                } catch(e) {
                    console.error(e);
                    return false;
                    // fs.copyFileSync(path.resolve(dataFolder, "img", this.getNoCover(covertype)), path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`))
                }
            }
        }
        return true;
    }

    async cacheAvatar() {
        if (!fs.existsSync(path.resolve(dataFolder, "avatars"))) {
            fs.mkdirSync(path.resolve(dataFolder, "avatars"));
        }
        if (fs.existsSync(path.resolve(dataFolder, "avatars", `${this.user.id}.png`))) {
            return;
        }
        var can = new Canvas.Canvas(128, 128);
        var con = can.getContext("2d");
        var img;
        try {
            img = await this.getImage(`https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.jpg?size=128`);
            con.drawImage(img, 0, 0, 128, 128);
            await this.savePNG(path.resolve(dataFolder, "avatars", `${this.user.id}.png`), can);
        } catch(e) {
            console.error(e);
        }
    }

    async drawGameCover(game, draw) {
        var covertype = this.getCoverType();
        var consoletype = this.getConsoleType(game);
        game = game.replace("wii-", "").replace("wiiu-", "");
        var region = this.getGameRegion(game);
        var extension = this.getExtension(covertype, consoletype);
        var cache = await this.cacheGameCover(game, region, covertype, consoletype, extension);
        if (cache && draw) {
            await this.drawImage(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`), this.covCurX, this.covCurY);
            // console.log(game);
            this.covCurX += this.covIncX;
            this.covCurY += this.covIncY;
        }
        return cache;
    }

    async drawAvatar(game) {
        await this.cacheAvatar();
        await this.drawImage(path.resolve(dataFolder, "avatars", `${this.user.id}.png`), this.overlay.avatar.x, this.overlay.avatar.y);
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
                // console.log("Loaded font");
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
        
        var covertype = this.getCoverType();
        
        if (covertype == "cover") {
            this.covStartY += 24;
        } else if (covertype == "disc") {
            this.covStartY += 88;
        }

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

        // game covers
        var games_draw = []
        
        if (this.user.sort.toLowerCase() != "none") {
            for (var game of this.user.games.reverse().slice(this.overlay.max_covers * -1)) {
                if (i < this.overlay.max_covers && game != "") {
                    var draw = await this.drawGameCover(game, false);
                    if (draw) {
                        games_draw.push(game)
                        i++;
                    }
                }
            }
        }

        // this code basically finds any blank spots where covers can be
        // the blank spots are because it can't find the cover
        // if there's blank spots, fill them in with covers until we reac the maximum amount
        for (let j = this.overlay.max_covers; j < this.user.games.length; j++) {
            if (games_draw.length < this.overlay.max_covers && games_draw.length != this.user.games.length && game != "") {
                var draw = await this.drawGameCover(this.user.games.reverse()[j], false);
                if (draw) {
                    games_draw.unshift(this.user.games.reverse()[j])
                }
            }
        }

        // finally draw the covers
        for (var game of games_draw) {
            var draw = await this.drawGameCover(game, true);
        }

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

        // avatar
        if (this.user.useavatar == "true") {
            this.drawAvatar();
        }

        this.pngStream = this.canvas.createPNGStream();

        if (this.size) {
            this.canvas2 = new Canvas.Canvas(this.overlay.width / 3, this.overlay.height / 3);
            this.ctx = this.canvas2.getContext("2d");
            await this.drawImageShrink(this.canvas, 0, 0, this.overlay.width / 3, this.overlay.height / 3);
            this.pngStream = this.canvas2.createPNGStream();
        }

        this.emit("done");
    }
}

module.exports = Tag;
