// Forked from Matthew Orland's DB driver
// used in the Starie Tech Bot Framework
//
// Modified to fit the needs of this project.

const sqlite = require("sqlite3");

class DatabaseDriver {
    constructor(filename) {
        this.dbPromise = new sqlite.Database(filename);
    }

    async create(table, fields) {
        var db = await this.dbPromise;
        if (!db) {
            console.error("Cannot access a non-existent database.");
        }
        await db.run(`CREATE TABLE IF NOT EXISTS \`${table}\`(${fields.join(", ")})`);
    }

    async insert(table, fields, values) {
        var db = await this.dbPromise;
        if (!db) {
            console.error("Cannot access a non-existent database.");
        }

        await db.run(`INSERT INTO \`${table}\`(\`${fields.join("`, `")}\`) VALUES('${values.join("', '")}')`);
    }

    async delete(table, id) {
        var db = await this.dbPromise;
        if (!db) {
            console.error("Cannot access a non-existent database.");
        }
        await db.run(`DELETE FROM \`${table}\` WHERE \`id\`="${id}"`);
    }

    async get(table, key, value) {
        var db = await this.dbPromise;
        // var results;

        if (!db) {
            console.error("Cannot access a non-existent database.");
        }

        var query = await new Promise(function(resolve, reject) {
            db.get(`SELECT * FROM \`${table}\` WHERE \`${key}\` = "${value}"`, function(err, row) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });

        return query;
    }

    async getTableSorted(table, key, desc) {
        var db = await this.dbPromise;
        if (!db) {
            console.error("Cannot access a non-existent database.");
        }
        if (!desc) {
            return await this.all(`SELECT * FROM \`${table}\` ORDER BY \`${key}\``);
        }
        else {
            return await this.all(`SELECT * FROM \`${table}\` ORDER BY \`${key}\` DESC`);
        }
    }

    async updateTable(table, key, value, userKey, userValue) {
        var db = await this.dbPromise;
        if (!db) {
            console.error("Cannot access a non-existent database.");
        }

        await db.run(`UPDATE \`${table}\` SET \`${key}\`="${value}" WHERE \`${userKey}\` = "${userValue}"`);
    }

    async run(sql) {
        var db = await this.dbPromise;

        if (!db) {
            console.error("Cannot access a non-existent database.");
        }

        await db.run(sql);
    }

    async all(sql) {
        var db = await this.dbPromise;

        if (!db) {
            console.error("Cannot access a non-existent database.");
        }

        return await new Promise(function(resolve, reject) {
            db.all(sql, function(err, rows) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
}


module.exports = DatabaseDriver;