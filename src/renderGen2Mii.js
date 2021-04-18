// Quick Story, this is literally the Mii2Studio python script; It is here to be converted into javascript. Fun, yeah?
// Anything Not Commented is either Javascript or currently being worked on.
// Most of the current focus should be commented with a basic overview of each area's function.

//import subprocess
//import sys
//from binascii import hexlify
//from os import remove
//from requests import get, post
//from struct import pack

// Ported to Javascript from https://github.com/RiiConnect24/mii2studio

const https = require("https");
const crypto = require("crypto");
const Canvas = require("canvas");
const utils = require("./utils");
const path = require("path");

var options = {}

module.exports = async function (QRCode, id, dataFolder) {

    //from gen2_wiiu_3ds_miitomo import Gen2Wiiu3dsMiitomo
    //from Crypto.Cipher import AES

    // Detect if file is an image or not
    // Send the QR Code to remote parser; Use as Mii Data. (Use a console.log() here to see what it returns)
    if (QRCode.slice(0, 6) == "ffd8ff") { // Magic Bytes for JP(E)G
        options = {
            hostname: 'qrcode.rc24.xyz',
            port: 443,
            path: '/qrcode.php',
            method: 'GET',
            headers: {
                'Content-Type': 'image/jpeg'
            }
        }
    } else if (QRCode.slice(0, 16) == "89504e470d0a1a0a") { // Magic Bytes for PNG
        options = {
            hostname: 'qrcode.rc24.xyz',
            port: 443,
            path: '/qrcode.php',
            method: 'GET',
            headers: {
                'Content-Type': 'image/png'
            }
        }
    } else {
        throw "Not a Valid Image Type";
    }

    // Original allowed URL input, that will not be the case here for security and bandwidth reasons.
    
    /*with open(input_file, "rb") as f:
    read = f.read()
    decoded_qr = post("https://", { "image": read }).content // zbar sucks to run on a client so we use this api*/
    const req = https.request(options, res => {
        res.on('data', d => {
            decoded_qr = d
        })
    })

    req.on('error', error => {
        throw error;
    })

    req.write(QRCode)
    req.end()

    freeze(10000);

    console.log(decoded_qr);

    // Wait for request to end somehow
    nonce = decoded_qr.toString().slice(0, 8)

    // https://gist.github.com/jaames/96ce8daa11b61b758b6b0227b55f9f78

    // Set a decryption key I guess? I'm assuming that's what this is.
    //key = bytes([0x59, 0xFC, 0x81, 0x7E, 0x64, 0x46, 0xEA, 0x61, 0x90, 0x34, 0x7B, 0x20, 0xE9, 0xBD, 0xCE, 0x52])
    const convert = (from, to) => str => Buffer.from(str, from).toString(to)
    const hexToUtf8 = convert('hex', 'utf8')
    const key = hexToUtf8("59FC817E6446EA6190347B20E9BDCE52")

    // Decode the output
    const decipher = crypto.createDecipheriv("aes-256-ccm", key, nonce + "0000");
    const decrypted = Buffer.concat([decipher.update(text.content, 'base64'), decipher.final()]);
    const result = decrypted.toString().slice(0, 12) + nonce + decrypted.toString().slice(13)

    console.log(result);

    /*nonce = decoded_qr[: 8]
    cipher = AES.new(key, AES.MODE_CCM, nonce + bytes([0, 0, 0, 0]))
    content = cipher.decrypt(decoded_qr[8: 96])
    result = content[: 12]+ nonce + content[12:]*/

    // (Use a console.log() here to see what it returns)

    // Mii Parsing
    // orig_mii = Gen2Wiiu3dsMiitomo.from_file(input_file)

    // U8 Something or other; Seems important.
    //def u8(data):
    //return pack(">B", data)

    /* Actually I have no clue what this does.
    for k, v in mii_types.items():
        if k >= orig_mii.avatar_id[0]:
            mii_type = i
    break
    i = v
    */

    // Creates new array studio_mii
    //studio_mii = {}

    // Lookup Tables
    /*makeup = {
        // lookup table
        1: 1,
        2: 6,
        3: 9,
        9: 10
    }

    wrinkles = {
        // lookup table
        4: 5,
        5: 2,
        6: 3,
        7: 7,
        8: 8,
        10: 9,
        11: 11
    }*/

    // We generate the Mii Studio file by reading each Mii format from the Kaitai files.
    // unlike consoles which store Mii data in an odd number of bits,
    // all the Mii data for a Mii Studio Mii is stored as unsigned 8 - bit integers.makes it easier.
    /*
        if "switch" not in input_type:
    if orig_mii.facial_hair_color == 0:
        studio_mii["facial_hair_color"] = 8
    else:
    studio_mii["facial_hair_color"] = orig_mii.facial_hair_color
    else:
    studio_mii["facial_hair_color"] = orig_mii.facial_hair_color
    studio_mii["beard_goatee"] = orig_mii.facial_hair_beard
    studio_mii["body_weight"] = orig_mii.body_weight
    if input_type == "wii":
        studio_mii["eye_stretch"] = 3
    else:
    studio_mii["eye_stretch"] = orig_mii.eye_stretch
    if "switch" not in input_type:
    studio_mii["eye_color"] = orig_mii.eye_color + 8
    else:
    studio_mii["eye_color"] = orig_mii.eye_color
    studio_mii["eye_rotation"] = orig_mii.eye_rotation
    studio_mii["eye_size"] = orig_mii.eye_size
    studio_mii["eye_type"] = orig_mii.eye_type
    studio_mii["eye_horizontal"] = orig_mii.eye_horizontal
    studio_mii["eye_vertical"] = orig_mii.eye_vertical
    if input_type == "wii":
        studio_mii["eyebrow_stretch"] = 3
    else:
    studio_mii["eyebrow_stretch"] = orig_mii.eyebrow_stretch
    if "switch" not in input_type:
    if orig_mii.eyebrow_color == 0:
        studio_mii["eyebrow_color"] = 8
    else:
    studio_mii["eyebrow_color"] = orig_mii.eyebrow_color
    else:
    studio_mii["eyebrow_color"] = orig_mii.eyebrow_color
    studio_mii["eyebrow_rotation"] = orig_mii.eyebrow_rotation
    studio_mii["eyebrow_size"] = orig_mii.eyebrow_size
    studio_mii["eyebrow_type"] = orig_mii.eyebrow_type
    studio_mii["eyebrow_horizontal"] = orig_mii.eyebrow_horizontal
    if input_type != "switch":
        studio_mii["eyebrow_vertical"] = orig_mii.eyebrow_vertical
    else:
    studio_mii["eyebrow_vertical"] = orig_mii.eyebrow_vertical + 3
    studio_mii["face_color"] = orig_mii.face_color
    if input_type == "wii":
        if orig_mii.facial_feature in makeup:
            studio_mii["face_makeup"] = makeup[orig_mii.facial_feature]
        else:
        studio_mii["face_makeup"] = 0
    else:
    studio_mii["face_makeup"] = orig_mii.face_makeup
    studio_mii["face_type"] = orig_mii.face_type
    if input_type == "wii":
        if orig_mii.facial_feature in wrinkles:
            studio_mii["face_wrinkles"] = wrinkles[orig_mii.facial_feature]
        else:
        studio_mii["face_wrinkles"] = 0
    else:
    studio_mii["face_wrinkles"] = orig_mii.face_wrinkles
    studio_mii["favorite_color"] = orig_mii.favorite_color
    studio_mii["gender"] = orig_mii.gender
    if "switch" not in input_type:
    if orig_mii.glasses_color == 0:
        studio_mii["glasses_color"] = 8
    elif orig_mii.glasses_color < 6:
    studio_mii["glasses_color"] = orig_mii.glasses_color + 13
        else:
    studio_mii["glasses_color"] = 0
    else:
    studio_mii["glasses_color"] = orig_mii.glasses_color
    studio_mii["glasses_size"] = orig_mii.glasses_size
    studio_mii["glasses_type"] = orig_mii.glasses_type
    studio_mii["glasses_vertical"] = orig_mii.glasses_vertical
    if "switch" not in input_type:
    if orig_mii.hair_color == 0:
        studio_mii["hair_color"] = 8
    else:
    studio_mii["hair_color"] = orig_mii.hair_color
    else:
    studio_mii["hair_color"] = orig_mii.hair_color
    studio_mii["hair_flip"] = orig_mii.hair_flip
    studio_mii["hair_type"] = orig_mii.hair_type
    studio_mii["body_height"] = orig_mii.body_height
    studio_mii["mole_size"] = orig_mii.mole_size
    studio_mii["mole_enable"] = orig_mii.mole_enable
    studio_mii["mole_horizontal"] = orig_mii.mole_horizontal
    studio_mii["mole_vertical"] = orig_mii.mole_vertical
    if input_type == "wii":
        studio_mii["mouth_stretch"] = 3
    else:
    studio_mii["mouth_stretch"] = orig_mii.mouth_stretch
    if "switch" not in input_type:
    if orig_mii.mouth_color < 4:
        studio_mii["mouth_color"] = orig_mii.mouth_color + 19
    else:
    studio_mii["mouth_color"] = 0
    else:
    studio_mii["mouth_color"] = orig_mii.mouth_color
    studio_mii["mouth_size"] = orig_mii.mouth_size
    studio_mii["mouth_type"] = orig_mii.mouth_type
    studio_mii["mouth_vertical"] = orig_mii.mouth_vertical
    studio_mii["beard_size"] = orig_mii.facial_hair_size
    studio_mii["beard_mustache"] = orig_mii.facial_hair_mustache
    studio_mii["beard_vertical"] = orig_mii.facial_hair_vertical
    studio_mii["nose_size"] = orig_mii.nose_size
    studio_mii["nose_type"] = orig_mii.nose_type
    studio_mii["nose_vertical"] = orig_mii.nose_vertical

    with open(output_file, "wb") as f:
    mii_data = b""
    n = r = 256
    mii_dict = []
    for i in range(0, len(hexlify(read)), 2):
        mii_dict.append(int(hexlify(read)[i: i + 2], 16))
    else:
    mii_dict = studio_mii.values()
    mii_data += hexlify(u8(0))
    for v in mii_dict:
        eo = (7 + (v ^ n)) % 256 // encode the Mii, Nintendo seemed to have randomized the encoding using Math.random() in JS, but we removed randomizing
    n = eo
    mii_data += hexlify(u8(eo))
    f.write(u8(v))

    f.close()

    url = "https://studio.mii.nintendo.com/miis/image.png?data=" + mii_data.decode("utf-8")

    print("Mii Render URLs:\n")
    print("Face: " + url + "&type=face&width=512&instanceCount=1")
    */
}

// For the renderer;
const endpoint = "https://studio.mii.nintendo.com/miis/image.png?data=";

async function RenderMiiGen2(hex, id, dataFolder) {
    var c = new Canvas.Canvas(512, 512);
    var ctx = c.getContext("2d");
    var img;
    try {
        img = await utils.getImage(`${endpoint}${hex}`);
        ctx.drawImage(img, 0, 0, 512, 512);
        await utils.savePNG(path.join(dataFolder, "miis", id + ".png"), c);
    } catch (e) {
        console.error(e);
    }
}

function editUser(id, key, value) {
    var p = path.resolve(dataFolder, "users", id + ".json");
    var jdata = JSON.parse(fs.readFileSync(p));
    jdata[key] = value;
    fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}

// Debugging Sleep Timer
function freeze(time) {
    const stop = new Date().getTime() + time;
    while (new Date().getTime() < stop);
}