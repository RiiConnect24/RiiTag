const Banner = require("./src/index");
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "data");
const json_string = fs.readFileSync(path.resolve(dataFolder, "debug", "user1.json"));

const express = require("express");
const app = express();

app.get("/", function(req, res) {
    res.send("Welcome to the RiiTag site! It's a little blech rn. The web designers will fix that! :D");
});

app.get("/demo", async function(req, res) {
    var banner = await new Banner(json_string);
    banner.once("done", function() {
        banner.pngStream.pipe(res);
    });
});

app.listen(3000, function() {
    console.log("RiiTag Server listening on port 3000");
});