const renderMiiFromHex = require("./rendermiifromhex");

module.exports = async function (entryentrynumberber, id, dataFolder) {

    // Parse Entry Number from xxxx-xxxx-xxxx -> xxxxxxxxxxxx if needed

    // Validate Entry Number

    // Translate Entry entrynumber into Mii ID entrynumber
    // Make this line Javascript vs Python (ffs); rest are fine.
    entrynumber = int(format(int(entrynumber), "032b").zfill(40)[8:], 2)
    entrynumber ^= 0x20070419
    entrynumber ^= (entrynumber >> 0x1D) ^ (entrynumber >> 0x11) ^ (entrynumber >> 0x17)
    entrynumber ^= (entrynumber & 0xF0F0F0F) << 4
    entrynumber ^= ((entrynumber << 0x1E) ^ (entrynumber << 0x12) ^ (entrynumber << 0x18)) & 0xFFFFFFFF

    //console.log(entrynumber);

    // Get Mii Data from Mii ID entrynumber -> miihex

    await renderMiiFromHex(miihex, id, dataFolder).catch(() => {
        console.log("Failed to render mii after parsing entry entrynumber");
    });

}