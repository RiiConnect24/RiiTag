
const Canvas = require("canvas");
const Image = Canvas.Image;

const fs = require("fs");
const events = require("events");

const savePNG = require("./utils").savePNG;
const getImage = require("./utils").getImage;

const path = require("path");
const dataFolder = path.resolve(__dirname, "..", "data");
// const outpath = path.resolve(__dirname, "banner.png"); // debug variable

const guests = {"a": "Guest A","b": "Guest B","c": "Guest C","d": "Guest D","e": "Guest E","f": "Guest F"};
const guestList = Object.keys(guests);
guestList.push("undefined");

const defaultDrawOrder = [
    "overlay",
    "covers",
    "flag",
    "coin",
    "avatar",
    "username",
    "coin_count",
    "friend_code"
]

class Tag extends events.EventEmitter{
    constructor(user, doMake=true) {
        super();

        this.user = this.loadUser(user);
        this.overlay = this.loadOverlay(this.user.overlay);
        this.savePNG = savePNG;
        this.getImage = getImage;

        if (doMake) this.makeBanner();
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

    async drawImage(source, x=0, y=0) {
        var obj = this;
        // console.log(source);
        getImage(source).then(function(img) {
            console.log(img);
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

    async getAndDrawImageShrink(source, x=0, y=0, shrinkx=0, shrinky=0) {
        var obj = this;
        getImage(source).then(function(img) {
            console.log(img);
            obj.ctx.drawImage(img, x, y, shrinkx, shrinky);
        }).catch(function(err) {
            console.error(err);
        });
    }

    getGameRegion(game) { // determine the game's region by its ID
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
        } else if (game.startsWith("ds-")) {
            return "ds";
        } else if (game.startsWith("3ds-")) {
            return "3ds";
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
        } else if (consoletype != "wii" && covertype == "cover") {
            return "jpg";
        } else {
            return "png";
        }
    }

    getCoverType(consoletype)
    {
        if (consoletype == "ds" || consoletype == "3ds") {
            return "box";
        } else if (this.user.covertype) {
            return this.user.covertype;
        } else {
            return "cover3D";
        }
    }

    getCoverWidth(covertype)
    {
        if (covertype == "cover") {
            return 160;
        } else if (covertype == "cover3D") {
            return 176;
        } else if (covertype == "disc") {
            return 160;
        } else if (covertype == "box") {
            return 176;
        } else {
            return 176;
        }
    }

    getCoverHeight(covertype, consoletype)
    {
        if (covertype == "cover") {
            if (consoletype == "ds" || consoletype == "3ds") {
                return 144;
            } else {
                return 224;
            }
        } else if (covertype == "cover3D") {
            return 248;
        } else if (covertype == "disc") {
            return 160;
        } else if (covertype == "box") {
            return 158;
        } else {
            return 248;
        }
    }

    getCoinImage()
    {
        if (this.user.coin) {
            if (this.user.coin == "default") {
                return this.overlay.coin_icon.img;
            }
            return this.user.coin;
        } else {
            return "mario"; // the mario coin is the default image
        }
    }

    getFont(type) {
        const defaultFont = "RodinNTLG";

        if (this.overlay[type].font_family) {
            if (this.user.font == "default" || this.overlay[type].force_font == "true") {
                return this.overlay[type].font_family;
            } else {
                if (this.user.font) {
                    return this.user.font;
                } else {
                    return defaultFont;
                }
            }
        } else {
            return defaultFont;
        }
    }

    getCoverUrl(consoletype, covertype, region, game, extension) {
        return `https://art.gametdb.com/${consoletype}/${covertype}/${region}/${game}.${extension}`;
    }

    async downloadGameCover(game, region, covertype, consoletype, extension) {
        var can = new Canvas.Canvas(this.getCoverWidth(covertype), this.getCoverHeight(covertype, consoletype));
        var con = can.getContext("2d");
        var img;

        img = await getImage(this.getCoverUrl(consoletype, covertype, region, game, extension));
        con.drawImage(img, 0, 0, this.getCoverWidth(covertype), this.getCoverHeight(covertype, consoletype));
        await savePNG(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`), can);
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
                    return false;
                }
            }
        }
        return true;
    }

    async cacheAvatar() {
        // if (!fs.existsSync(path.resolve(dataFolder, "avatars"))) {
        //     fs.mkdirSync(path.resolve(dataFolder, "avatars"));
        // }
        // if (fs.existsSync(path.resolve(dataFolder, "avatars", `${this.user.id}.png`))) {
        //     return;
        // }
        var can = new Canvas.Canvas(512, 512);
        if (!fs.existsSync(path.resolve(dataFolder, "avatars"))) {
            fs.mkdirSync(path.resolve(dataFolder, "avatars"));
        }
        var con = can.getContext("2d");
        var img;
        try {
            img = await getImage(`https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=512`);
            con.drawImage(img, 0, 0, 512, 512);
            await savePNG(path.resolve(dataFolder, "avatars", `${this.user.id}.png`), can);
        } catch(e) {
            return false;
        }
    }

    async drawGameCover(game, draw) {
        var consoletype = this.getConsoleType(game);
        var covertype = this.getCoverType(consoletype);
        game = game.replace("wii-", "").replace("wiiu-", "").replace("3ds-", "").replace("ds-", "");
        var region = this.getGameRegion(game);
        var extension = this.getExtension(covertype, consoletype);
        var cache = await this.cacheGameCover(game, region, covertype, consoletype, extension);
        if (cache && draw) {
            var inc = 0;
            if (consoletype == "ds" || consoletype == "3ds") {
                if (covertype == "box") {
                    inc = 87;
                } else if (covertype == "cover") {
                    inc = 80;
                }
            }

            var coverPath = `${consoletype}-${covertype}-${game}-${region}.png`;

            if (!fs.existsSync(path.resolve(dataFolder, "cache", coverPath))) {
                var allRegions = ["US", "EN", "FR", "DE", "ES", "IT", "NL", "PT", "AU", "SE", "DK", "NO", "FI", "TR"];
                
                for (var r in allRegions) {
                    coverPath = `${consoletype}-${covertype}-${game}-${allRegions[r]}.png`;

                    if (fs.existsSync(path.resolve(dataFolder, "cache", coverPath))) {
                        await this.drawImage(path.resolve(dataFolder, "cache", coverPath), this.covCurX, this.covCurY + inc);

                        this.covCurX += this.covIncX;
                        this.covCurY += this.covIncY;
            
                        break;
                    }
                }
            } else {
    await this.drawImage(path.resolve(dataFolder, "cache", coverPath), this.covCurX, this.covCurY + inc);

    this.covCurX += this.covIncX;
    this.covCurY += this.covIncY;
}

// console.log(game);
        }
        return cache;
    }

    async drawAvatar() {
        if (this.overlay.avatar) {
            await this.cacheAvatar();
            await this.getAndDrawImageShrink(path.resolve(dataFolder, "avatars", `${this.user.id}.png`), this.overlay.avatar.x, this.overlay.avatar.y, this.overlay.avatar.size, this.overlay.avatar.size);
        }
    }

    async drawMii() {
        if (!this.user.mii_data || this.user.mii_data == "") {
            this.user.mii_data = "undefined";
        }
        if (this.overlay.mii) {
            if (guestList.includes(this.user.mii_data)) {
                await this.getAndDrawImageShrink(path.resolve(dataFolder, "miis", "guests", `${this.user.mii_data}.png`), this.overlay.mii.x, this.overlay.mii.y, this.overlay.mii.size, this.overlay.mii.size);
            } else {
                await this.getAndDrawImageShrink(path.resolve(dataFolder, "miis", `${this.user.id}.png`), this.overlay.mii.x, this.overlay.mii.y, this.overlay.mii.size, this.overlay.mii.size).catch(async function(e) {
                    console.error("Couldn't render Mii for " + user.id + ". Falling back to undefined.");
                    await this.getAndDrawImageShrink(path.resolve(dataFolder, "miis", "guests", `undefined.png`), this.overlay.mii.x, this.overlay.mii.y, this.overlay.mii.size, this.overlay.mii.size);
                });
            }
        }
    }

    // async savePNG(out, c) {
    //     return new Promise(function(resolve) {
    //         c.createPNGStream().pipe(fs.createWriteStream(out)).on("close", function() {
    //             // console.log("File written");
    //             resolve();
    //         });
    //     });
    // }

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
        
        var covertype = this.getCoverType(false);
        
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

        // overlay image
        await this.drawImage(path.resolve(dataFolder, this.overlay.overlay_img));

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
            if (games_draw.length < this.overlay.max_covers && games_draw.length != this.user.games.length && game != "" && !games_draw.includes(this.user.games.reverse()[j])) {
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

        // flag icon
        await this.drawImage(path.resolve(dataFolder, "flags", `${this.user.region}.png`),
            this.overlay.flag.x,
            this.overlay.flag.y);

        // coin image/text
        await this.drawImage(path.resolve(dataFolder, "img", "coin", this.getCoinImage() + ".png"),
            this.overlay.coin_icon.x,
            this.overlay.coin_icon.y);

        // username text
        await this.drawText(this.getFont("username"),
            this.overlay.username.font_size,
            this.overlay.username.font_style,
            this.overlay.username.font_color,
            this.user.name,
            this.overlay.username.x,
            this.overlay.username.y)

        // friend code text
        await this.drawText(this.getFont("friend_code"),
            this.overlay.friend_code.font_size,
            this.overlay.friend_code.font_style,
            this.overlay.friend_code.font_color,
            this.user.friend_code,
            this.overlay.friend_code.x,
            this.overlay.friend_code.y);

        // coin count text
        await this.drawText(this.getFont("coin_count"),
            this.overlay.coin_count.font_size,
            this.overlay.coin_count.font_style,
            this.overlay.coin_count.font_color,
            this.user.coins,
            this.overlay.coin_count.x,
            this.overlay.coin_count.y);

        // avatar
        if (this.user.useavatar == "true") {
            await this.drawAvatar();
        }

        if (this.user.usemii == "true") {
            await this.drawMii();
        }

        await this.savePNG(path.resolve(dataFolder, "tag", `${this.user.id}.max.png`), this.canvas);

        this.canvas2 = new Canvas.Canvas(this.overlay.width / 3, this.overlay.height / 3);
        this.ctx = this.canvas2.getContext("2d");
        await this.drawImageShrink(this.canvas, 0, 0, this.overlay.width / 3, this.overlay.height / 3);
        await this.savePNG(path.resolve(dataFolder, "tag", `${this.user.id}.png`), this.canvas2);

        this.emit("done");
    }
}

module.exports = Tag;

if (module == require.main) {
    var jstring = fs.readFileSync(path.resolve(dataFolder, "debug", "user1.json"));
  
    var banner = new Tag(jstring, true);
    var maxbanner = new Tag(jstring, false);

    banner.once("done", function () {
        var out = fs.createWriteStream(path.resolve(dataFolder, "debug", "user1.png"));
        var stream = banner.pngStream;

        stream.on('data', function (chunk) {
            out.write(chunk);
        });
    });

    maxbanner.once("done", function () {
        var out = fs.createWriteStream(path.resolve(dataFolder, "debug", "user1.max.png"));
        var stream = banner.pngStream;

        stream.on('data', function (chunk) {
            out.write(chunk);
        });
    });
}