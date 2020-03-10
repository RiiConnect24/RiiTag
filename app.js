const Banner = require("./src/index");
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "data");
const json_string = fs.readFileSync(path.resolve(dataFolder, "debug", "user1.json"));
const DiscordStrategy = require("passport-discord").Strategy;
const passport = require("passport");
const config = JSON.parse(fs.readFileSync("config.json"));
const session = require("express-session");
const bodyParser = require("body-parser");
const xml = require("xml");
const DatabaseDriver = require("./dbdriver");

const db = new DatabaseDriver(path.join(__dirname, "data", "users", "users.db"));
const Sentry = require('@sentry/node');
const express = require("express");
const app = express();

Sentry.init({ dsn: config.sentryURL });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

app.set("view-engine", "pug");

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

var scopes = ['identify'];

passport.use(new DiscordStrategy({
    clientID: "684886188603080716",
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL
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

app.get("/", function(req, res) {
    res.render("index.pug");
});


app.get("/demo", async function(req, res) {
    var banner = await new Banner(json_string);
    banner.once("done", function() {
        banner.pngStream.pipe(res);
    });
});

app.get('/login', passport.authenticate('discord', { scope: scopes }), function(req, res) {});

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.redirect("/create") } // auth success
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
                                    coverregions: getCoverRegions(),
                                    userKey: userKey
                                });
        } catch(e) {
            console.log(e);
            res.redirect("/create");
        }
    })
    .post(checkAuth, function(req, res) {
        // fs.writeFileSync(path.resolve(dataFolder, "users", req.user.id + ".json"), req.body.jstring);
        // var jdata = JSON.parse(path.resolve(dataFolder, "users", req.user.id + ".json"));
        // console.log(req.body.background);
        // jdata.bg = `/img/1200x450/${req.body.background}`;
        editUser(req.user.id, "bg", req.body.background);
        editUser(req.user.id, "overlay", req.body.overlay);
        editUser(req.user.id, "region", req.body.flag);
        editUser(req.user.id, "name", req.body.name);
        editUser(req.user.id, "friend_code", req.body.wiinumber);
        editUser(req.user.id, "games", req.body.games.split(";"));
        editUser(req.user.id, "coverregion", req.body.coverregion);
        editUser(req.user.id, "useavatar", req.body.useavatar);
        res.redirect(`/${req.user.id}`);
    });

app.get("/create", checkAuth, function(req, res) {
    createUser(req.user);
    editUser(req.user.id, "avatar", req.user.avatar);
    res.redirect(`/${req.user.id}`);
});

app.get("/img/flags/:flag.png", function(req, res) {
    try {
        var file = path.resolve(dataFolder, "flags", req.params.flag + ".png");
        var s = fs.createReadStream(file);
        s.on('open', function() {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
    } catch(e) {
        res.render("notfound.pug", {err: e});
    }
});

app.get("/img/:size/:background.png", function(req, res) {
    try {
        var file = path.resolve(dataFolder, "img", req.params.size, req.params.background + ".png");
        var s = fs.createReadStream(file);
        s.on('open', function() {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
    } catch(e) {
        res.render("notfound.pug", {err: e});
    }
});

app.get("/:id/tag.png", function(req, res) {
    try {
        var jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.params.id + ".json"));
        var banner = new Banner(jstring, true);
        banner.once("done", function() {
            banner.pngStream.pipe(res);
        });
    } catch(e) {
        console.log(e);
        // res.send("That user ID does not exist.<br/>~Nick \"Larsenv\" Fibonacci - 2019<br/><br/>" + e);
        res.render("notfound.pug", {err: e});
    }
});

app.get("/:id/tag.max.png", function(req, res) {
    try {
        var jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.params.id + ".json"));
        var banner = new Banner(jstring, false);
        banner.once("done", function() {
            banner.pngStream.pipe(res);
        });
    } catch(e) {
        console.log(e);
        // res.send("That user ID does not exist.<br/>~Nick \"Larsenv\" Fibonacci - 2019<br/><br/>" + e);
        res.render("notfound.pug", {err: e});
    }
});

app.get("/wii", async function(req, res) {
    var key = req.query.key || "";
    var gameID = req.query.game || "";

    if (key == "") {
        return respond(res, "key is undefined", 400);
    } else if (gameID == "") {
        return respond(res, "game is undefined", 400);
    }

    var userID = await getUserID(key);
    if (userID == undefined) {
        return respond(res, "A user by that key does not exist", 400);
    } else {
        var c = getUserAttrib(userID, "coins")
        var games = getUserAttrib(userID, "games");
        var newGames = updateGameArray(games, gameID);
        // console.log(games);
        // console.log(newGames);
        setUserAttrib(userID, "coins", c + 1);
        setUserAttrib(userID, "games", newGames);
        res.status(200).send();
    }
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


app.get("/:id", function(req, res) {
    // var key = req.params.id;
    // console.log(key);
    res.render("tagpage.pug", {id: req.params.id,
                               user: getUserData(req.params.id),
                               backgrounds: getBackgroundList(),
                               overlays: getOverlayList()
                              });
});
// app.get("/edit/:id", function(req, res) {
//     // display a page with the user's jstring and allow them to edit it manually.
//     // this is super dangerous lmao
// });

app.listen(3000, async function() {
    cleanCache();
    console.log("Cleaned cache");
    await db.create("users", ["id INTEGER PRIMARY KEY", "snowflake TEXT", "key TEXT"]);
    // db.insert("users", ["snowflake", "key"], ["test_sf", "test_key"]);
    console.log("RiiTag Server listening on port 3000");
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
    return JSON.parse(fs.readFileSync(path.resolve(dataFolder, "flags", "flags.json")));
}

function getCoverRegions() {
    return ["EN", "FR", "DE", "ES", "IT", "NL", "PT", "AU", "SE", "DK", "NO", "FI", "TR"]
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
    var jdata = JSON.parse(fs.readFileSync(p));
    return jdata || null;
}

async function createUser(user) {
    if (!fs.existsSync(path.resolve(dataFolder, "users", user.id + ".json"))) {
        var ujson = {
            name: user.username,
            id: user.id,
            games: [],
            coins: 0,
            friend_code: "0000 0000 0000 0000",
            region: "rc24",
            overlay: "overlay1.json",
            bg: "img/1200x450/riiconnect241.png",
            sort: "" 
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
