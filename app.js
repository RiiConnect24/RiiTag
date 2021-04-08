const tracer = require('dd-trace').init({ runtimeMetrics: true });
const Banner = require("./src/index");
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "data");
const json_string = fs.readFileSync(path.resolve(dataFolder, "debug", "user1.json"));
const DiscordStrategy = require("passport-discord").Strategy;
const passport = require("passport");
const config = loadConfig();
const session = require("express-session");
const bodyParser = require("body-parser");
const xml = require("xml");
const DatabaseDriver = require("./dbdriver");
const renderMiiFromHex = require("./src/rendermiifromhex");

const db = new DatabaseDriver(path.join(__dirname, "users.db"));
const Sentry = require('@sentry/node');
const express = require("express");
// const { render } = require("pug");
const app = express();

const guests = {"a": "Guest A","b": "Guest B","c": "Guest C","d": "Guest D","e": "Guest E","f": "Guest F"};
const guestList = Object.keys(guests);
guestList.push("undefined");

const port = config.port || 3000;

var StatsD = require('hot-shots');
var dogstatsd = new StatsD();

Sentry.init({ dsn: config.sentryURL });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

var dd_options = {
  'response_code':true,
  'tags': ['app:riitag']
}

var connect_datadog = require('connect-datadog')(dd_options);

app.use(connect_datadog);

app.set("view-engine", "pug");

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

var scopes = ['identify'];

passport.use(new DiscordStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.hostURL.replace("{{port}}", port) + "callback"
}, function(accessToken, refreshToken, profile, done) {
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

app.get("/", function(req, res) {
    res.render("index.pug", { user: req.user });
});


app.get("/demo", async function(req, res) {
    var banner = await new Banner(json_string);
    banner.once("done", function() {
        banner.pngStream.pipe(res);
    });
});

app.get('/login', function(req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect("/");
    }
    next()
}, passport.authenticate('discord', { scope: scopes }));

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect("/")
});

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.cookie("uid", req.user.id); res.redirect("/create") } // auth success
);

app.route("/edit")
    .get(checkAuth, async function(req, res) {
        var jstring;
        try {
            jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.user.id + ".json")).toString();
            var userKey = await getUserKey(req.user.id);
            if (userKey == undefined) {
                throw new Error("User Key is undefined");
            }
            res.render("edit.pug", {jstring: jstring,
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
        } catch(e) {
            console.log(e);
            res.redirect("/create");
        }
    })
    .post(checkAuth, async function(req, res) {
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
        editUser(req.user.id, "avatar", req.user.avatar);
        if (!guestList.includes(req.body.miidata)) {
            await renderMiiFromHex(req.body.miidata, req.user.id, dataFolder).catch(() => {
                console.log("Failed to render mii");
            });
        }
        res.redirect(`/${req.user.id}`);
        var banner = await getTag(req.user.id).catch(function () {
            res.status(404).render("notfound.pug");
            return
        });
    });


app.get("/create", checkAuth, async function(req, res) {
    if (!fs.existsSync(path.resolve(dataFolder, "tag"))) {
        fs.mkdirSync(path.resolve(dataFolder, "tag"));
    }
    createUser(req.user);
    editUser(req.user.id, "avatar", req.user.avatar);
    var banner = await getTag(req.user.id).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
    res.redirect(`/${req.user.id}`);
});

function getTag(id) {
    return new Promise(function(resolve, reject) {
        try {
            var jstring = fs.readFileSync(path.resolve(dataFolder, "users", `${id}.json`));
            var banner = new Banner(jstring);
            banner.once("done", function() {
                resolve(banner);
            });
        } catch(e) {
            console.log(e);
            reject(e);
        }
    })
}


app.get("^/:id([0-9]+)/tag.png", async function(req, res) {
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

app.get("^/:id([0-9]+)/tag.max.png", async function(req, res) {
    try {
        if (!fs.existsSync(path.resolve(dataFolder, "tag"))) {
            fs.mkdirSync(path.resolve(dataFolder, "tag"));
        }
        if (!fs.existsSync(path.resolve(dataFolder, "users", `${req.params.id}.json`)) || !fs.existsSync(path.resolve(dataFolder, "tag", `${req.params.id}.max.png`))) {
            res.status(404).render("notfound.pug");
        }
        var file = path.resolve(dataFolder, "tag", req.params.id + ".max.png");
        var s = fs.createReadStream(file);
        s.on('open', function() {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
     } catch(e) {
         res.status(404).render("notfound.pug");
     }
});

app.get("/wii", async function(req, res) {
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
            res.status(429).send(); // cooldown
            return
        }
    }

    var c = getUserAttrib(userID, "coins")
    var games = getUserAttrib(userID, "games");
    var newGames = updateGameArray(games, "wii-" + gameID);
    setUserAttrib(userID, "coins", c + 1);
    setUserAttrib(userID, "games", newGames);
    setUserAttrib(userID, "lastplayed", ["wii-" + gameID, Math.floor(Date.now() / 1000)]);
    res.status(200).send();

    var banner = await getTag(userID).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
});

app.get("/wiiu", async function(req, res) {
    var key = req.query.key || "";
    var gameTID = req.query.game.toUpperCase() || "";

    var ids = JSON.parse(fs.readFileSync(path.resolve(dataFolder, "ids", "wiiu.json"))) // 16 digit TID -> 4 or 6 digit game ID

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
            res.status(429).send(); // cooldown
            return
        }
    }

    var c = getUserAttrib(userID, "coins")
    var games = getUserAttrib(userID, "games");
    var newGames = updateGameArray(games, "wiiu-" + ids[gameTID]);
    setUserAttrib(userID, "coins", c + 1);
    setUserAttrib(userID, "games", newGames);
    setUserAttrib(userID, "lastplayed", ["wiiu-" + ids[gameTID], Math.floor(Date.now() / 1000)]);
    res.status(200).send();

    var banner = await getTag(userID).catch(function () {
        res.status(404).render("notfound.pug");
        return
    });
});

app.get("/Wiinnertag.xml", checkAuth, async function(req, res) {
    // console.log(req.user.id);
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


app.get("^/:id([0-9]+)", function(req, res, next) {
    // var key = req.params.id;
    // console.log(key);
    var userData = getUserData(req.params.id);
    
    if (!userData) {
        res.status(404).render("notfound.pug");
        return;
    };

    res.render("tagpage.pug", {id: req.params.id,
                               tuser: userData,
                               user: req.user,
                               flags: getFlagList(),
                               backgrounds: getBackgroundList(),
                               overlays: getOverlayList()
                              });
});

app.get("^/:id([0-9]+)/json", function(req, res) {
    var userData = getUserData(req.params.id);
    res.type("application/json");

    if (!userData) {
        res.status(404).send(JSON.stringify({error: "That user ID does not exist."}));
        return;
    };

    var lastPlayed = {};
    if (userData.lastplayed.length !== 0) {
        var banner = new Banner(JSON.stringify(userData), doMake=false);
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
        user: {name: userData.name, id: userData.id},
        tag_url: {normal: tagUrl, max: tagUrl.replace(".png", ".max.png")},
        game_data: {last_played: lastPlayed, games: userData.games}
    }));
});

app.listen(port, async function() {
    // cleanCache();
    // console.log("Cleaned cache");
    await db.create("users", ["id INTEGER PRIMARY KEY", "snowflake TEXT", "key TEXT"]);
    // db.insert("users", ["snowflake", "key"], ["test_sf", "test_key"]);
    console.log("RiiTag Server listening on port " + port);
});

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

function getBackgroundList() {
    return fs.readdirSync(path.resolve(dataFolder, "img", "1200x450"));
}

function getOverlayList() {
    var overlays = [];
    fs.readdirSync(path.resolve(dataFolder, "overlays")).forEach(function(overlayFile) {
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
    return ["EN", "FR", "DE", "ES", "IT", "NL", "PT", "AU", "SE", "DK", "NO", "FI", "TR"];
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
    } catch(e) {
        return null;
    }
    
    return jdata;
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

function cleanCache() {
    var c = path.resolve(dataFolder, "cache");
    fs.readdirSync(c).forEach(function(file) {
        fs.unlinkSync(path.resolve(c, file));
    });
}

function generateRandomKey(keyLength) {
    const chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";
    var key = "";
    var lastChar = ""

    for (var i = 0; i < keyLength; i++) {
        var char = chars.charAt(Math.floor(Math.random() * chars.length));
        while (char == lastChar) {
            // console.log("Dupe char");
            char = chars.charAt(Math.floor(Math.random() * chars.length));
        }
        key += char;
        lastChar = char;
    }

    return key;
}

function respond(res, message, code=200) {
    res.status(code).send(message);
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
    // console.log(games);
    for(var i = games.length - 1; i >= 0; i--) {
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
    res.render("notfound.pug");
});

module.exports = {
    dataFolder: dataFolder
}
