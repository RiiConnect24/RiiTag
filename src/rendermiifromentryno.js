const renderMiiFromHex = require("./rendermiifromhex");
const request = require('request');
const fs = require("fs");
const path = require("path");
const dataFolder = path.resolve(__dirname, "../data");
const Canvas = require("canvas");
const utils = require("./utils");

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

    // Setup Request Data
    var requestSettings = {
        url: "https://miicontestp.wii.rc24.xyz/cgi-bin/studio.cgi",
        headers: {
            "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary2bpPmOcP6IdUsMAq",
            "Accept": "*/*"

        },
        body: "------WebKitFormBoundary2bpPmOcP6IdUsMAq\r\nContent-Disposition: form-data; name=\"platform\"\r\n\r\nwii\r\n------WebKitFormBoundary2bpPmOcP6IdUsMAq\r\nContent-Disposition: form-data; name=\"id\"\r\n\r\n" + entrynumber + "\r\n------WebKitFormBoundary2bpPmOcP6IdUsMAq--\r\n",
        encoding: null
    };

    // Get Mii Data from Mii ID Number -> miihex
    request.post(requestSettings, async function (error, response, body) {
        if (!error && response.statusCode == 200) {
            stringBody = body.toString();
            retData = stringBody.replace(/ /g, "").replace(/{/g, "").replace(/}/g, "").replace(/:/g, "").replace(/m/g, "").replace(/i/g, "").replace(/\"/g, "")
            editUser(id, "mii_data", retData);
            
            // Save Mii Icon, see ./rendermiifronhex.js
            var c = new Canvas.Canvas(512, 512);
            var ctx = c.getContext("2d");
            var img;
            try {
                img = await utils.getImage("https://studio.mii.nintendo.com/miis/image.png?data=" + retData + "&type=face&width=512&instanceCount=1");
                ctx.drawImage(img, 0, 0, 512, 512);
                await utils.savePNG(path.join(dataFolder, "miis", id + ".png"), c);
            } catch(e) {
                console.error(e);
            }

            return;
        } else {
            throw "Non HTTP 200 Status code returned from CMOC Mii Host!";
        }
    });
}

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}