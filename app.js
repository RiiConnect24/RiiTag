const Banner = require("./src/index");
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "data");
const json_string = fs.readFileSync(path.resolve(dataFolder, "debug", "user1.json"));

new Banner(json_string);