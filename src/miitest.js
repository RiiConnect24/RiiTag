const fs = require("fs");
const Mii = require("./mii");
const KaitaiStream = require("kaitai-struct/KaitaiStream");
const wii2studio = require("./miiutil").wii2studio;

const testMiiFile = fs.readFileSync("./test.mii");
const testMii = new Mii(new KaitaiStream(testMiiFile));

wii2studio("./test.mii");