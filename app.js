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

const express = require("express");
const app = express();

app.set("view-engine", "pug");

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

var scopes = ['identify'];

passport.use(new DiscordStrategy({
    clientID: "583346143736627213",
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL
}, function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

app.use(session({
    secret: "super secret"
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", function(req, res) {
    res.send("Welcome to the RiiTag site! It's a little blech rn. The web designers will fix that! :D");
});

app.get("/demo", async function(req, res) {
    var banner = await new Banner(json_string);
    banner.once("done", function() {
        banner.pngStream.pipe(res);
    });
});

app.get('/login', passport.authenticate('discord', { scope: scopes }), function(req, res) {});

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.redirect(`/${req.user.id}`) } // auth success
);

app.route("/edit")
    .get(checkAuth, function(req, res) {
        var jstring;
        try {
            jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.user.id + ".json")).toString();
            // jstring = JSON.stringify(req.user);
            console.log(jstring);
            res.render("edit.pug", {jstring: jstring,
                                    backgrounds: getBackgroundList(),
                                    jdata: JSON.parse(jstring),
                                    overlays: getOverlayList()});
        } catch(e) {
            res.redirect("/create");
        }
    })
    .post(checkAuth, function(req, res) {
        // fs.writeFileSync(path.resolve(dataFolder, "users", req.user.id + ".json"), req.body.jstring);
        // var jdata = JSON.parse(path.resolve(dataFolder, "users", req.user.id + ".json"));
        console.log(req.body.background);
        // jdata.bg = `/img/1200x450/${req.body.background}`;
        editUser(req.user.id, "bg", req.body.background);
        editUser(req.user.id, "overlay", req.body.overlay);
        editUser(req.user.id, "name", req.body.name);
        editUser(req.user.id, "games", req.body.games.split(";"))
        res.redirect(`/${req.user.id}`);
    });

app.get("/create", checkAuth, function(req, res) {
    createUser(req.user);
    res.redirect(`/${req.user.id}`);
});

app.get("/:id/tag.png", function(req, res) {
    try {
        var jstring = fs.readFileSync(path.resolve(dataFolder, "users", req.params.id + ".json"));
        var banner = new Banner(jstring);
        banner.once("done", function() {
            banner.pngStream.pipe(res);
        });
    } catch(e) {
        console.log(e);
        // res.send("That user ID does not exist.<br/>~Nick \"Larsenv\" Fibonacci - 2019<br/><br/>" + e);
        res.render("notfound.pug", {err: e});
    }
});

app.get("/:id", function(req, res) {
    res.render("tagpage.pug", {id: req.params.id});
});

// app.get("/edit/:id", function(req, res) {
//     // display a page with the user's jstring and allow them to edit it manually.
//     // this is super dangerous lmao
// });

app.listen(3000, function() {
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

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}

function getUserAttrib(id, key) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    return jdata[key] || "N/A";
}

function createUser(user) {
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