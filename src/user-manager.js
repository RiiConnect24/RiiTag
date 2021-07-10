class UserManager {
    load(json) {
        return JSON.parse(json);
    }
}

module.exports = UserManager;