const Banner = require("./src/index");
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "data");
const DiscordStrategy = require("passport-discord").Strategy;
const passport = require("passport");
const config = loadConfig();
const session = require("express-session");
const bodyParser = require("body-parser");
const xml = require("xml");
const DatabaseDriver = require("./dbdriver");
const renderMiiFromHex = require("./src/rendermiifromhex");
const renderMiiFromEntryNo = require("./src/rendermiifromentryno");
const renderGen2Mii = require("./src/renderGen2Mii");
const Axios = require("axios");
const Canvas = require("canvas");
const Image = Canvas.Image;

const db = new DatabaseDriver(path.join(__dirname, "users.db"));
const gameDb = new DatabaseDriver(path.join(__dirname, "games.db"));
const coinDb = new DatabaseDriver(path.join(__dirname, "coins.db"));
var wiiTDB = {};
const Sentry = require('@sentry/node');
const express = require("express");
const app = express();

const guests = { "a": "Guest A", "b": "Guest B", "c": "Guest C", "d": "Guest D", "e": "Guest E", "f": "Guest F" };
const guestList = Object.keys(guests);
guestList.push("undefined");

const port = config.port || 3000;

Sentry.init({ dsn: config.sentryURL });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

var dd_options = {
    'response_code': true,
    'tags': ['app:riitag']
}

var connect_datadog = require('connect-datadog')(dd_options);

app.use(connect_datadog);

app.set("view-engine", "pug");

passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

var scopes = ['identify'];

passport.use(new DiscordStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.hostURL.replace("{{port}}", port) + "callback"
}, function (accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

app.use(session({
    secret: generateRandomKey(512)
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public/"));
app.use(express.static("data/"));

app.set("view engine", "pug");

app.get("/", function (req, res) {
    res.render("index.pug", { user: req.user, tags: getHomeTags() });
});

app.get('/login', function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect("/");
    }
    next()
}, passport.authenticate('discord', { scope: scopes }));

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect("/")
});

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) {
        res.cookie("uid", req.user.id);
        if (config.admins.includes(req.user.id)) {
            req.user.admin = true;
        } else {
            req.user.admin = false;
        }
        res.redirect("/create");
    } // Auth success
);

app.route("/edit")
    .get(checkAuth, async function (req, res) {
        var jstring;
        try {
            jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.user.id + ".json")).toString();
            var userKey = await getUserKey(req.user.id);
            if (userKey == undefined) {
                throw new Error("User Key is undefined");
            }
            res.render("edit.pug", {
                jstring: jstring,
                backgrounds: getBackgroundList(),
                jdata: JSON.parse(jstring),
                overlays: getOverlayList(),
                flags: getFlagList(),
                coins: getCoinList(),
                covertypes: getCoverTypes(),
                coverregions: getCoverRegions(),
                fonts: getFonts(),
                userKey: userKey,
                user: req.user
            });
        } catch (e) {
            console.log(e);
            res.redirect("/create");
        }
    })
    .post(checkAuth, async function (req, res) {
        editUser(req.user.id, "bg", req.body.background);
        editUser(req.user.id, "overlay", req.body.overlay);
        editUser(req.user.id, "region", req.body.flag);
        editUser(req.user.id, "coin", req.body.coin);
        editUser(req.user.id, "name", req.body.name);
        editUser(req.user.id, "friend_code", req.body.wiinumber);
        editUser(req.user.id, "games", req.body.games.split(";"));
        editUser(req.user.id, "covertype", req.body.covertype);
        editUser(req.user.id, "coverregion", req.body.coverregion);
        editUser(req.user.id, "useavatar", req.body.useavatar);
        editUser(req.user.id, "usemii", req.body.usemii);
        editUser(req.user.id, "font", req.body.font);
        editUser(req.user.id, "mii_data", req.body.miidata);
        editUser(req.user.id, "mii_number", req.body.miinumber);
        editUser(req.user.id, "avatar", req.user.avatar);
        if (req.body.MiiType == "CMOC") {
            await renderMiiFromEntryNo(req.body.miinumber, req.user.id, dataFolder).catch((err) => {
                console.log("Failed to render mii from mii entry number");
            });
        } else if (req.body.MiiType == "Upload" || req.body.MiiType == "Guest") {
            if (!guestList.includes(req.body.miidata)) {
                await renderMiiFromHex(req.body.miidata, req.user.id, dataFolder).catch(() => {
                    console.log("Failed to render mii");
                });
            }
        } else if (req.body.MiiType == "Gen2") {
            await renderGen2Mii(req.body.miidata, req.user.id, dataFolder).catch((err) => {
                console.log("Failed to render mii from QR Code: " + err);
            });
        } else {
            console.log("Invalid/No Mii Type chosen.");
        }
        setTimeout(function () {
            getTag(req.user.id, res).catch((err) => {
                if (err == "Redirect") {
                    res.redirect(`/${req.user.id}`);
                } else {
                    res.status(404).render("notfound.pug");
                    return;
                }
            })
        }, 2000);
    });

app.get("/admin", checkAdmin, function(req, res) {
    res.render("admin.pug", { user: req.user });
});

app.get("^/admin/refresh/:id([0-9]+)", checkAdmin, async function(req, res) {
    if (!req.params.id) {
        res.redirect(`/${req.user.id}`);
    }
    getTag(req.user.id, res).catch((err) => {
        if (err == "Redirect") {
            res.redirect(`/${req.user.id}`);
        } else {
            res.status(404).render("notfound.pug");
            return;
        }
    })
    res.redirect(`/${req.params.id}`);
});

app.get("/create", checkAuth, async function (req, res) {
    if (!fs.existsSync(path.resolve(dataFolder, "tag"))) {
        fs.mkdirSync(path.resolve(dataFolder, "tag"));
    }
    createUser(req.user);
    editUser(req.user.id, "avatar", req.user.avatar);
    var exists = await coinDb.exists("coins", "snowflake", req.user.id);
    if (!exists) {
        await coinDb.insert("coins", ["snowflake", "count"], [req.user.id, getUserData(req.user.id).coins]);
    }
    getTag(req.user.id, res).catch((err) => {
        if (err == "Redirect") {
            res.redirect(`/${req.user.id}`);
        } else {
            res.status(404).render("notfound.pug");
            return;
        }
    })
});


app.get("^/:id([0-9]+)/tag.png", async function (req, res) {
    try {
        if (!fs.existsSync(path.resolve(dataFolder, "tag"))) {
            fs.mkdirSync(path.resolve(dataFolder, "tag"));
        }
        if (!fs.existsSync(path.resolve(dataFolder, "users", `${req.params.id}.json`)) || !fs.existsSync(path.resolve(dataFolder, "tag", `${req.params.id}.png`))) {
            res.status(404).render("notfound.pug");
        }
        var file = path.resolve(dataFolder, "tag", req.params.id + ".png");
        var s = fs.createReadStream(file);
        s.on('open', function () {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
    } catch (e) {
        res.status(404).render("notfound.pug");
    }
});

app.get("^/:id([0-9]+)/tag.max.png", async function (req, res) {
    try {
        if (!fs.existsSync(path.resolve(dataFolder, "tag"))) {
            fs.mkdirSync(path.resolve(dataFolder, "tag"));
        }
        if (!fs.existsSync(path.resolve(dataFolder, "users", `${req.params.id}.json`)) || !fs.existsSync(path.resolve(dataFolder, "tag", `${req.params.id}.max.png`))) {
            res.status(404).render("notfound.pug");
        }
        var file = path.resolve(dataFolder, "tag", req.params.id + ".max.png");
        var s = fs.createReadStream(file);
        s.on('open', function () {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
     } catch (e) {
         res.status(404).render("notfound.pug");
     }
});

app.get("^/:id([0-9]+)/riitag.wad", checkAuth, async function(req, res) {

    if (!fs.existsSync(path.resolve(dataFolder, "wads"))) {
        return;
    }
    if (!fs.existsSync(path.resolve(dataFolder, "users", `${req.params.id}.json`)) || !fs.existsSync(path.resolve(dataFolder, "tag", `${req.params.id}.max.png`))) {
        res.status(404).render("notfound.pug");
    }
    if (!fs.existsSync(path.resolve(dataFolder, "wads", `${req.params.id}.wad`))) {
        const exec = require("child_process").execSync;

        var unpack = exec(`sharpii WAD -u ${dataFolder}/wads/riitag.wad ${dataFolder}/wads/${req.params.id}`);

        const fd = fs.openSync(path.resolve(dataFolder, "wads", `${req.params.id}`, "00000001.app"), "r+");
        const text = `tag.rc24.xyz/${req.params.id}/tag.max.png`;
        const position = 0x1F3A4;
        fs.writeSync(fd, text, position, 'utf8');

        var pack = exec(`sharpii WAD -p ${dataFolder}/wads/${req.params.id} ${dataFolder}/wads/${req.params.id}.wad`);

        fs.rm(`${dataFolder}/wads/${req.params.id}`, { recursive: true }, (err) => {
            if (err) {
                // File deletion failed
                console.error(err.message);
                return;
            }
        });
    }
    var file = path.resolve(dataFolder, "wads", `${req.params.id}.wad`);
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.set('Content-Type', 'application/octet-stream');
        s.pipe(res);
    });
})

app.get("/wii", async function (req, res) {
    var key = req.query.key || "";
    var gameID = req.query.game || "";

    if (key == "" || gameID == "") {
        res.status(400).send();
        return
    }

    var userID = await getUserID(key);
    if (userID == undefined) {
        res.status(400).send();
        return
    }

    if (getUserAttrib(userID, "lastplayed") !== null) {
        if (Math.floor(Date.now() / 1000) - getUserAttrib(userID, "lastplayed")[1] < 60) {
            res.status(429).send(); // Cooldown
            return
        }
    }

    var c = getUserAttrib(userID, "coins")
    var games = getUserAttrib(userID, "games");
    var newGames = updateGameArray(games, "wii-" + gameID);
    setUserAttrib(userID, "coins", c + 1);
    setUserAttrib(userID, "games", newGames);
    setUserAttrib(userID, "lastplayed", ["wii-" + gameID, Math.floor(Date.now() / 1000)]);

    await gamePlayed(gameID, 0, req.user.id);
    res.status(200).send(gameID);

    var banner = await getTagEP(userID).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
});

app.get("/wiiu", async function (req, res) {
    var key = req.query.key || "";
    var gameTID = req.query.game || "";
    var origin = req.query.source || "";

    gameTID = gameTID.replace(/%26/g, "&").replace(/ - /g, "\n")

    if (key == "" || gameTID == "") {
        res.status(400).send();
        return
    }

    var userID = await getUserID(key);
    if (userID == undefined) {
        res.status(400).send();
        return
    }

    if (getUserAttrib(userID, "lastplayed") !== null) {
        if (Math.floor(Date.now() / 1000) - getUserAttrib(userID, "lastplayed")[1] < 60) {
            res.status(429).send(); // Cooldown
            return
        }
    }

    if (origin == "Cemu") {
        var userRegion = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "users", userID + ".json")).toString()).coverregion;
        gameTID = getCemuGameRegion(gameTID, userRegion); // Returns a game Title ID
        if (gameTID == 1) {
            res.status(400).send();
            return
        }
    }

    gameTID = gameTID.toUpperCase();

    var ids = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "ids", "wiiu.json"))) // 16 digit TID -> 4 or 6 digit game ID
    var console = "wiiu-"
    
    if (!ids[gameTID]) {
        var ids = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "ids", "wiiVC.json"))) // 16 digit TID -> 4 or 6 digit game ID WiiVC Inject
        console = "wii-"
    }

    var c = getUserAttrib(userID, "coins")
    var games = getUserAttrib(userID, "games");
    var newGames = updateGameArray(games, console + ids[gameTID]);
    setUserAttrib(userID, "coins", c + 1);
    setUserAttrib(userID, "games", newGames);
    setUserAttrib(userID, "lastplayed", [console + ids[gameTID], Math.floor(Date.now() / 1000)]);
    res.status(200).send();

    var banner = await getTagEP(userID).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
});

app.get("/3ds", async function (req, res) {
    var key = req.query.key || "";
    var gameName = req.query.game || "";

    if (key == "" || gameName == "") {
        res.status(400).send();
        return
    }

    var userID = await getUserID(key);
    if (userID == undefined) {
        res.status(400).send();
        return
    }

    if (getUserAttrib(userID, "lastplayed") !== null) {
        if (Math.floor(Date.now() / 1000) - getUserAttrib(userID, "lastplayed")[1] < 60) {
            res.status(429).send(); // Cooldown
            return
        }
    }

    var userRegion = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "users", userID + ".json")).toString()).coverregion;

    gameID = getCitraGameRegion(gameName, userRegion); // Returns an ID4

    var c = getUserAttrib(userID, "coins")
    var games = getUserAttrib(userID, "games");
    var newGames = updateGameArray(games, "3ds-" + gameID);
    setUserAttrib(userID, "coins", c + 1);
    setUserAttrib(userID, "games", newGames);
    setUserAttrib(userID, "lastplayed", ["3ds-" + gameID, Math.floor(Date.now() / 1000)]);
    res.status(200).send();

    var banner = await getTagEP(userID).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
});

app.get("/Wiinnertag.xml", checkAuth, async function (req, res) {
    var userKey = await getUserKey(req.user.id);
    var tag = {
        Tag: {
            _attr: {
                URL: "http://tag.rc24.xyz/wii?game={ID6}&key={KEY}",
                Key: userKey
            }
        }
    }
    res.type("application/xml");
    res.send(xml(tag, {
        declaration: true
    }));
});


app.get("^/:id([0-9]+)", function (req, res, next) {
    var userData = getUserData(req.params.id);
    
    if (!userData) {
        res.status(404).render("notfound.pug");
        return;
    };

    res.render("tagpage.pug", {
        id: req.params.id,
        tuser: userData,
        user: req.user,
        flags: getFlagList(),
        backgrounds: getBackgroundList(),
        overlays: getOverlayList()
    });
});

app.get("^/:id([0-9]+)/json", function (req, res) {
    var userData = getUserData(req.params.id);
    res.type("application/json");

    if (!userData) {
        res.status(404).send(JSON.stringify({ error: "That user ID does not exist." }));
        return;
    };

    var lastPlayed = {};
    if (userData.lastplayed.length !== 0) {
        var banner = new Banner(JSON.stringify(userData), doMake = false);
        var game = userData.lastplayed[0];
        var time = userData.lastplayed[1];
        var gameid = game.split("-")[1]

        var consoletype = banner.getConsoleType(game);
        var covertype = banner.getCoverType(consoletype);
        var region = banner.getGameRegion(gameid);
        var extension = banner.getExtension(covertype, consoletype);

        var lastPlayed = {
            game_id: gameid,
            console: consoletype,
            region: region,
            cover_url: banner.getCoverUrl(consoletype, covertype, region, gameid, extension),
            time: time
        };
    };

    var tagUrl = `https://tag.rc24.xyz/${userData.id}/tag.png`;
    res.send(JSON.stringify({
        user: { name: userData.name, id: userData.id },
        tag_url: { normal: tagUrl, max: tagUrl.replace(".png", ".max.png") },
        game_data: { last_played: lastPlayed, games: userData.games }
    }));
});

app.get("/game-leaderboard", async function (req, res) {
    var games = await gameDb.getTableSorted("games", "count", true);
    var limit = parseInt(req.query.limit);
    if (!limit || limit > 50 || limit == "NaN") {
        limit = 10;
    }
    res.render("gameleaderboard.pug", {
        user: req.user,
        wiiTDB: wiiTDB,
        games: games,
        limit: limit,
    });
});

app.get("/cover", async function (req, res) {
    var game = req.query.game;
    if (!game) {
        res.status(500).send("Error 500 - No game provided.");
    }
    var consoletype = getConsoleType(game);
    var covertype = getCoverType(consoletype);
    game = game.replace("wii-", "").replace("wiiu-", "").replace("3ds-", "").replace("ds-", "");
    var region = getGameRegion(game);
    var extension = getExtension(covertype, consoletype);
    var cache = await cacheGameCover(game, region, covertype, consoletype, extension);
    if (cache) {
        res.sendFile(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`));
    } else {
        res.status(500).send("Error 500 - Cache was not available.");
    }
});

app.listen(port, async function () {
    await db.create("users", ["id INTEGER PRIMARY KEY", "snowflake TEXT", "key TEXT"]);
    await gameDb.create("games", ["id INTEGER PRIMARY KEY", "console INTEGER", "gameID TEXT", "count INTEGER"]);
    await coinDb.create("coins", ["id INTEGER PRIMARY KEY", "snowflake TEXT", "count INTEGER"]);
    await cacheWiiTDB();
    console.log("RiiTag Server listening on port " + port);
});

async function getTag(id, res) {
    return new Promise(function (resolve, reject) {
        try {
            var jstring = fs.readFileSync(path.resolve(dataFolder, "users", `${id}.json`));
            var banner = new Banner(jstring);
            banner.once("done", function () {
                try {
                    res.redirect(`/${id}`);
                } catch (e) {
                    reject("Redirect");
                }
                resolve(banner);
            });
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

async function getTagEP(id) {
    return new Promise(function (resolve, reject) {
        try {
            var jstring = fs.readFileSync(path.resolve(dataFolder, "users", `${id}.json`));
            var banner = new Banner(jstring);
            banner.once("done", function () {
                resolve(banner);
            });
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

function checkAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user.admin) {
            return next()
        }
    }
    res.render("notfound.pug", {
        user: req.user,
    });
}

function getBackgroundList() {
    return fs.readdirSync(path.resolve(dataFolder, "img", "1200x450"));
}

function getOverlayList() {
    var overlays = [];
    fs.readdirSync(path.resolve(dataFolder, "overlays")).forEach(function (overlayFile) {
        overlays.push(JSON.parse(fs.readFileSync(path.resolve(dataFolder, "overlays", overlayFile))));
    });
    return overlays;
}

function getFlagList() {
    console.log()
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "meta", "flags.json")));
}

function getCoinList() {
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "meta", "coin.json")));
}

function getCoverTypes() {
    return ["cover3D", "cover", "disc"];
}

function getCoverRegions() {
    return ["EN", "FR", "DE", "ES", "IT", "NL", "PT", "AU", "SE", "DK", "NO", "FI", "TR", "JP", "KO", "TW"];
}

function getFonts() {
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "meta", "fonts.json")))
}

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}

function getUserAttrib(id, key) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    return jdata[key] || null;
}

function setUserAttrib(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}

function getUserData(id) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    try {
        var jdata = JSON.parse(fs.readFileSync(p));
    } catch (e) {
        return null;
    }
    
    return jdata;
}

async function gamePlayed(id, console, user) {
    var exists = await gameDb.exists("games", "gameID", id);
    if (!exists) {
        await gameDb.insert("games", ["console", "gameID", "count"], [console, id, 0]);
    }
    await gameDb.increment("games", "gameID", id, "count").catch(function(err) {
        process.stdout.write(err + "\n");
    });
    await coinDb.increment("coins", "snowflake", user, "count").catch(function(err) {
        process.stdout.write(err + "\n");
    });
}

async function cacheWiiTDB() {
    const url = "http://www.gametdb.com/wiitdb.txt?LANG=ORIG";
    var ret = false;
    const response = await Axios({
        url,
        method: "GET",
        responseType: "text",
    }).catch(function(err) {
        console.log(err);
        ret = true;
    });
    if (ret) {
        return;
    }
    response.data.split("\r\n").forEach(function(line) {
        try {
            var split = line.split(" = ");
            var key = split[0];
            var val = split[1];
            wiiTDB[key] = val;
        } catch(err) {
            console.log(`WiiTDB Cache: Failed on ${line}`);
            console.log(err);
        }
    });
}

async function createUser(user) {
    if (!fs.existsSync(path.resolve(dataFolder, "users", user.id + ".json"))) {
        var ujson = {
            name: user.username,
            id: user.id,
            games: [],
            lastplayed: [],
            coins: 0,
            friend_code: "0000 0000 0000 0000",
            region: "rc24",
            overlay: "overlay1.json",
            bg: "img/1200x450/riiconnect241.png",
            sort: "",
            font: "default"
        };
    
        fs.writeFileSync(path.resolve(dataFolder, "users", user.id + ".json"), JSON.stringify(ujson, null, 4));
    }

    var userKey = await getUserKey(user.id);
    if (!userKey) {
        db.insert("users", ["snowflake", "key"], [user.id, generateRandomKey(128)]);
    }
}

function generateRandomKey(keyLength) {
    const chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";
    var key = "";
    var lastChar = ""

    for (var i = 0; i < keyLength; i++) {
        var char = chars.charAt(Math.floor(Math.random() * chars.length));
        while (char == lastChar) {
            char = chars.charAt(Math.floor(Math.random() * chars.length));
        }
        key += char;
        lastChar = char;
    }

    return key;
}

async function getUserKey(id) {
    var dbres = await db.get("users", "snowflake", id);
    if (dbres == undefined) {
        return undefined;
    } else {
        return dbres.key;
    }
}

async function getUserID(key) {
    var dbres = await db.get("users", "key", key);
    if (dbres == undefined) {
        return undefined;
    } else {
        return dbres.snowflake;
    }
}

function updateGameArray(games, game) {
    for (var i = games.length - 1; i >= 0; i--) {
        if (games[i] == game) {
            games.splice(i, 1);
        }
    }
    games.unshift(game);
    return games;
}

function loadConfig() {
    const configFile = "config.json";
    if (!fs.existsSync(configFile)) {
        fs.copyFileSync("config.json.example", configFile);
        console.log("'config.json' has been created. Please edit the values in 'config.json' and restart the server.")
        process.exit(0);
    }
    return JSON.parse(fs.readFileSync("config.json"));
}

function getHomeTags() {
    // TODO **URGENT**: Calculate tags to show on front page
}

app.use(function(req, res, next) {
    var allowed = [
        "/img",
        "/overlays",
        "/flags"
    ];
    for (var index of allowed) {
        if (req.path.indexOf(index)) {
            console.log(req.path);
            next();
        }
    }
    res.status(404);
    res.render("notfound.pug", {
        user: req.user,
    });
});

function getGameRegion(game) {
    var chars = game.split("");
    var rc = chars[3];
    if (rc == "P") {
        return "EN"
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

function getConsoleType(game) {
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

function getExtension(covertype, consoletype) {
    if (consoletype == "wii") {
        return "png";
    } else if (consoletype != "wii" && covertype == "cover") {
        return "jpg";
    } else {
        return "png";
    }
}

function getCoverType(consoletype) {
    if (consoletype == "ds" || consoletype == "3ds") {
        return "box";
    } else {
        return "cover3D";
    }
}

function getCoverWidth(covertype) {
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

function getCoverHeight(covertype, consoletype) {
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

function getCoverUrl(consoletype, covertype, region, game, extension) {
    return `https://art.gametdb.com/${consoletype}/${covertype}/${region}/${game}.${extension}`;
}

async function downloadGameCover(game, region, covertype, consoletype, extension) {
    var can = new Canvas.Canvas(getCoverWidth(covertype), getCoverHeight(covertype, consoletype));
    var con = can.getContext("2d");
    var img;

    img = await getImage(getCoverUrl(consoletype, covertype, region, game, extension));
    con.drawImage(img, 0, 0, getCoverWidth(covertype), getCoverHeight(covertype, consoletype));
    await savePNG(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`), can);
}

async function cacheGameCover(game, region, covertype, consoletype, extension) {
    if (!fs.existsSync(path.resolve(dataFolder, "cache"))) {
        fs.mkdirSync(path.resolve(dataFolder, "cache"));
    }
    if (fs.existsSync(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`))) {
        return true;
    }
    try {
        await downloadGameCover(game, region, covertype, consoletype, extension);
    } catch(e) {
        try {
            await downloadGameCover(game, "EN", covertype, consoletype, extension); // Cover might not exist?
        } catch(e) {
            try {
                await downloadGameCover(game, "US", covertype, consoletype, extension); // Small chance it's US region
            } catch(e) {
                return false;
            }
        }
    }
    return true;
}

async function downloadGameCover(game, region, covertype, consoletype, extension) {
    var can = new Canvas.Canvas(getCoverWidth(covertype), getCoverHeight(covertype, consoletype));
    var con = can.getContext("2d");
    var img;

    img = await getImage(getCoverUrl(consoletype, covertype, region, game, extension));
    con.drawImage(img, 0, 0, getCoverWidth(covertype), getCoverHeight(covertype, consoletype));
    await savePNG(path.resolve(dataFolder, "cache", `${consoletype}-${covertype}-${game}-${region}.png`), can);
}

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

function getCitraGameRegion(gameName, coverRegion) {
    var ids = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "ids", "3ds.json"))) // 16 digit TID -> 4 or 6 digit game ID

    if (!ids[gameName][1]) { // Prevent pointless searching for a proper region
        return ids[gameName][0];
    }

    /*  Regions and Fallbacks
        Europe: P with V Fallback, then X, Y or Z, then J.
        America: E with X, Y, or Z fallback, then P
        Japan: J with E fallback
        Everything else: P Fallback

        This should hopefully create a safety net where there's always some region avalible.
        If not just return "ids[gameName][0]" to use the first entry for the game.
    */

    for (IDs of ids[gameName]) {
        var gameRegion = IDs.slice(-1);
        var userRegion = coverRegion;

        if (userRegion == "FR" && gameRegion == "F") return IDs;
        if (userRegion == "DE" && gameRegion == "D") return IDs;
        if (userRegion == "ES" && gameRegion == "S") return IDs;
        if (userRegion == "IT" && gameRegion == "I") return IDs;
        if (userRegion == "NL" && gameRegion == "H") return IDs;
        if (userRegion == "KO" && gameRegion == "K") return IDs;
        if (userRegion == "TW" && gameRegion == "W") return IDs;

        if (userRegion == "JP" && gameRegion == "J") return IDs;
        if (userRegion == "JP") userRegion = "EN"; // Fallback

        if (userRegion == "EN" && gameRegion == "E") return IDs;
        if (userRegion == "EN" && (gameRegion == "X" || gameRegion == "Y" || gameRegion == "Z")) return IDs;

        if (gameRegion == "P") return IDs;
        if (gameRegion == "V") return IDs;
        if (gameRegion == "X" || gameRegion == "Y" || gameRegion == "Z") return IDs;
        if (gameRegion == "E") return IDs;
        if (gameRegion == "J") return IDs;
    }
    // In case nothing was found, return the first ID.
    return ids[gameName][0];
}

function getCemuGameRegion(gameName, coverRegion) {
    var ids = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "ids", "cemu.json"))) // 16 digit TID -> 4 or 6 digit game ID

    for (Regions of ids[gameName]) {
        var userRegion = coverRegion;

        if (userRegion == "FR" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "DE" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "ES" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "IT" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "NL" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "KO" && Regions["EUR"]) return Regions["EUR"];
        if (userRegion == "TW" && Regions["EUR"]) return Regions["EUR"];

        if (userRegion == "JP" && Regions["JPN"]) return Regions["JPN"];
        if (userRegion == "JP") userRegion = "EN"; // Fallback

        if (userRegion == "EN" && Regions["USA"]) return Regions["USA"];
    }

    // In case nothing was found, return the first ID.
    // This will happen if the cover type doesn't have a corresponding region.
    return ids[gameName][0];
}

app.use(function (req, res, next) {
    var allowed = [
        "/img",
        "/overlays",
        "/flags"
    ];
    for (var index of allowed) {
        if (req.path.indexOf(index)) {
            console.log(req.path);
            next();
        }
    }
    res.status(404);
    res.render("notfound.pug");
});

module.exports = {
    dataFolder: dataFolder
}