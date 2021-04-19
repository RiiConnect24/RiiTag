const renderMiiFromHex = require("./rendermiifromhex");
const request = require('request');
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "../data");

module.exports = async function (entrynumber, id, dataFolder) {

    // Parse and Validate Entry Number
    // Check for non number characters or dashes
    var regex = /^[0-9\-]+$/
    entrynumber = entrynumber.toString();
    var isValid = regex.test(entrynumber);
    if (!isValid) {
        throw "Entered Mii Number contains Invalid Characters!";
    } else {
        // Remove Dashes if needed (Using Regex to remove all instances)
        entrynumber = entrynumber.replace(/-/g, "");

        // Check length to ensure it's 12 characters
        if (entrynumber.length != 12) {
            throw "Entered Mii Number isn't 12 characters long!"
        }
    }

    // Translate Entry Number into Mii ID Number
    entrynumber = (entrynumber >>> 0).toString(2)
    entrynumber = parseInt(entrynumber, 2);
    entrynumber = (entrynumber ^= 0x20070419) >>> 0;
    entrynumber = (entrynumber ^= (entrynumber >>> 0x1D) ^ (entrynumber >>> 0x11) ^ (entrynumber >>> 0x17)) >>> 0;
    entrynumber = (entrynumber ^= ((entrynumber & 0xF0F0F0F) >>> 0) << 4) >>> 0;
    entrynumber = (entrynumber ^= ((entrynumber << 0x1E) ^ (entrynumber << 0x12) ^ (entrynumber << 0x18)) & 0xFFFFFFFF) >>> 0;
    entrynumber = parseInt(entrynumber);

    // Setup Request Data
    var requestSettings = {
        url: "https://miicontest.wii.rc24.xyz/render/entry-" + entrynumber.toString() + ".mii",
        encoding: null
    };

    // Get Mii Data from Mii ID Number -> miihex
    request.get(requestSettings, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var file = body;
            var fileBuffer = Buffer.from(file)
            var arrayBuffer = new ArrayBuffer(fileBuffer.length);
            var typedArray = new Uint8Array(arrayBuffer);
            for (var i = 0; i < fileBuffer.length; ++i) {
                typedArray[i] = fileBuffer[i];
            }
            var dv = new DataView(arrayBuffer, 0);
            var byteArray = [];
            for (var i = 0; i < 74; i++) {
                byteArray.push(dv.getUint8(i));
            }
            var hexString = Array.from(byteArray, function (byte) {
                return ("0" + (byte & 0xFF).toString(16)).slice(-2);
            }).join('');
            editUser(id, "mii_data", hexString.toString());
            renderMii(hexString, id, dataFolder);
            return;
        } else {
            throw "Non HTTP 200 Status code returned from CMOC Mii Host!";
        }
    });
}

async function renderMii(miihex, id, dataFolder) {

    // Render the Mii
    await renderMiiFromHex(miihex, id, dataFolder).catch(() => {
        console.log("Failed to render mii after parsing entry number!");
    });
    return;
}

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}