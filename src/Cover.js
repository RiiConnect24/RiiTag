/**
 * The base Cover constructor and de-constructor.
 */
class Cover
{
    constructor(game, user)
    {
        this.game = game;
        this.user = user;
    }

    /**
     * Use the game's ID to determine the current region. 
     */
    getRegion() {
        var regionCode = this.game[3];

        switch (regionCode) {
            case "P":
                if (this.user.coverregion && this.user.coverregion.toUpperCase().length == 2)
                    return this.user.coverregion.toUpperCase();
            case "E":
                return "US";
            case "J":
                return "JA";
            case "K":
                return "KO";
            case "W":
                return "TW";
            default:
                return "EN";
        }
    }

    /**
     * Use the ID structure to determine the current console.
     * @param {string} game 
     */
    getConsole() {
        var consoleCode = this.game[0], // Obtain the console-level code.
            consoleBase = subString(0, this.game.indexOf("-")); // Strip everything behind the hyphen to obtain the base.

        switch (consoleBase) {
            case "wii": 
                return "wii";
            case "wiiu":
                return "wiiu";
            case "ds":
                return "ds";
            case "3ds":
                return "3ds";
            default:
                switch (consoleCode) {
                    case "A":
                    case "B":
                        return "wiiu";
                    default:
                    case "R":
                    case "S":
                        return "wii";
                }
        }
    }

    /**
     * Determine the file extension by the console and cover type.
     * @param {string} cover
     * @param {string} console
     */
    getExtension() {
        if (this.getConsole() != "wii" && this.getType() == "cover")
            return "jpg";

        return "png";
    }

    /**
     * Obtain the type of cover based on console type.
     * @param {string} consoletype 
     */
    getType()
    {
        switch (this.getConsole()) {
            case "ds":
            case "3ds":
                return "box";
            default:
                return this.user.covertype||"cover3D";
        }
    }

    /**
     * Obtain cover dimensions by specified cover-type.
     * @param {string} type 
     * @returns {Vector2D}
     */
    getDimensions()
    {
        switch (this.getType()) {
            case "cover":
                return {width: 160, height: (this.getConsole() == "ds" || this.getConsole()=="3ds") ? 144 : 224};
            case "cover3D":
                return {width: 176, height: 248};
            case "disc":
                return {width: 160, height: 160};
            default:
            case "box":
                return {width: 176, height: 248};
        }
    }
}

module.exports = Cover;