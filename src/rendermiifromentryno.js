const renderMiiFromHex = require("./rendermiifromhex");
var request = require('request');

module.exports = async function (entrynumber, id, dataFolder) {

    // Parse and Validate Entry Number
    entrynumber = await validateEntryNumber(entrynumber).catch(() => {
        console.log("Failed to render mii during parsing of entry number");
    }); // Currently just returns same as passed in, no dashes please!

    // Translate Entry Number into Mii ID Number
    entrynumber = (entrynumber >>> 0).toString(2)
    entrynumber = parseInt(entrynumber, 2);
    entrynumber = (entrynumber ^= 0x20070419) >>> 0;
    entrynumber = (entrynumber ^= (entrynumber >>> 0x1D) ^ (entrynumber >>> 0x11) ^ (entrynumber >>> 0x17)) >>> 0;
    entrynumber = (entrynumber ^= ((entrynumber & 0xF0F0F0F) >>> 0) << 4) >>> 0;
    entrynumber = (entrynumber ^= ((entrynumber << 0x1E) ^ (entrynumber << 0x12) ^ (entrynumber << 0x18)) & 0xFFFFFFFF) >>> 0;
    entrynumber = parseInt(entrynumber);

    // Get Mii Data from Mii ID Number -> miihex
    request.get("https://miicontest.wii.rc24.xyz/render/entry-" + entrynumber.toString() + ".mii", function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var file = body;
            console.log(file);
            var fileBuffer = Buffer.from(file)
            console.log(fileBuffer);
            var arrayBuffer = new ArrayBuffer(fileBuffer.length);
            var typedArray = new Uint8Array(arrayBuffer);
            for (var i = 0; i < fileBuffer.length; ++i) {
                typedArray[i] = fileBuffer[i];
            }
            console.log(arrayBuffer);
            var dv = new DataView(arrayBuffer, 0);
            var byteArray = [];
            for (var i = 0; i < 74; i++) {
                byteArray.push(dv.getUint8(i));
            }
            var hexString = Array.from(byteArray, function (byte) {
                return ("0" + (byte & 0xFF).toString(16)).slice(-2);
            }).join('');
            renderMii(hexString, id, dataFolder)
        } else {
            throw 0; // Needs something to throw; it's handled by app.js regardless.
        }
    });
}

async function renderMii(miihex, id, dataFolder) {

    // Render the Mii
    await renderMiiFromHex(miihex, id, dataFolder).catch(() => {
        console.log("Failed to render mii after parsing entry number");
    });

}

async function validateEntryNumber(entrynumber) {

    // Check for non number characters or dashes

    // Remove Dashes if needed

    // Check length to ensure it's 12 characters

    return entrynumber;

}