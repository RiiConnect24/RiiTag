const Mii = require("./mii");
const KaitaiStream = require("kaitai-struct/KaitaiStream");
const fs = require("fs");

const makeup = {
    "1": 1,
    "2": 6,
    "3": 9,
    "9": 10
};

const wrinkles = {
    "4": 5,
    "5": 2,
    "6": 3,
    "7": 7,
    "8": 8,
    "10": 9,
    "11": 11
};

module.exports.wii2studio = function(miiPath) {
    var origMiiFile = fs.readFileSync(miiPath);
    var origMii;
    var studioMii = {};
    
    try {
        origMii = new Mii(new KaitaiStream(origMiiFile));
    } catch (e) {
        console.error(e);
        return "";
    }
    
    studioMii["facialHairColor"] = origMii.facialHairColor;
    studioMii["beardGoatee"] = origMii.facialHairBeard;
    studioMii["bodyWeight"] = origMii.bodyWeight;
    studioMii["eyeStretch"] = 3;
    studioMii["eyeColor"] = origMii.eyeColor + 8;
    studioMii["eyeRotation"] = origMii.eyeRotation;
    studioMii["eyeSize"] = origMii.eyeSize;
    studioMii["eyeType"] = origMii.eyeType;
    studioMii["eyeHorizontal"] = origMii.eyeHorizontal;
    studioMii["eyeVertical"] = origMii.eyeVertical;
    studioMii["eyebrowStretch"] = 3;
    studioMii["eyebrowColor"] = origMii.eyebrowColor;
    studioMii["eyebrowRotation"] = origMii.eyebrowRotation;
    studioMii["eyebrowSize"] = origMii.eyebrowSize;
    studioMii["eyebrowType"] = origMii.eyebrowType;
    studioMii["eyebrowHorizontal"] = origMii.eyebrowHorizontal;
    studioMii["eyebrowVertical"] = origMii.eyebrowVertical;
    studioMii["faceColor"] = origMii.faceColor;

    // TODO: Write logic to include makeup and wrinkles
    // studioMii["faceMakeup"] = 0;
    // 

    if (Object.keys(makeup).includes(origMii.facialFeature.toString())) {
        studioMii["faceMakeup"] = makeup[origMii.facialFeature];
    } else {
        studioMii["faceMakeup"] = 0;
    }

    studioMii["faceType"] = origMii.faceType

    if (Object.keys(wrinkles).includes(origMii.facialFeature.toString())) {
        studioMii["faceWrinkles"] = wrinkles[origMii.facialFeature];
    } else {
        studioMii["faceWrinkles"] = 0;
    }
    // console.log();

    studioMii["favoriteColor"] = origMii.favoriteColor
    studioMii["gender"] = origMii.gender

    if (origMii.glassesColor == 0) {
        studioMii.glassesColor = 8;
    } else if (origMii.glassesColor < 6) {
        studioMii.glassesColor = origMii.glassesColor + 13;
    } else {
        studioMii.glassesColor = 0;
    }

    studioMii["glassesSize"] = origMii.glassesSize
    studioMii["glassesType"] = origMii.glassesType
    studioMii["glassesVertical"] = origMii.glassesVertical
    studioMii["hairColor"] = origMii.hairColor
    studioMii["hairFlip"] = origMii.hairFlip
    studioMii["hairType"] = origMii.hairType
    studioMii["bodyHeight"] = origMii.bodyHeight
    studioMii["moleSize"] = origMii.moleSize
    studioMii["moleEnable"] = origMii.moleEnable
    studioMii["moleHorizontal"] = origMii.moleHorizontal
    studioMii["moleVertical"] = origMii.moleVertical
    studioMii["mouthStretch"] = 3

    if (origMii.mouthColor < 4) {
        studioMii.mouthColor = origMii.mouthColor + 19
    }

    studioMii["mouthSize"] = origMii.mouthSize
    studioMii["mouthType"] = origMii.mouthType
    studioMii["mouthVertical"] = origMii.mouthVertical
    studioMii["beardSize"] = origMii.facialHairSize
    studioMii["beardMustache"] = origMii.facialHairMustache
    studioMii["beardVertical"] = origMii.facialHairVertical
    studioMii["noseSize"] = origMii.noseSize
    studioMii["noseType"] = origMii.noseType
    studioMii["noseVertical"] = origMii.noseVertical

    console.log(studioMii);

    var miiData = new Buffer.from("");
    var u8 = new Buffer.alloc(1);
    // u8.writeUInt8(0x0, 0);
    miiData += u8.toString('hex');
    var n = 256;

    for (var v of Object.values(studioMii)) {
        var eo = (7 + (v ^ n)) % 256;
        n = eo;
        u8.writeUInt8(eo, 0);
        miiData += u8.toString('hex');
    }

    console.log("https://studio.mii.nintendo.com/miis/image.png?data=" + miiData.toString('utf-8') + "&type=face&width=512&instanceCount=1");
}