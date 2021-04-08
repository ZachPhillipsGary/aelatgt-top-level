const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const fs = require("fs");

class SimpleDB {
    // if a DB file isn't provided, use an in memory DB by default (DO NOT DO IN PRODUCTION)
    constructor(db_type = ":memory:") {
        // grab env params, we grab DB_FILE again so we don't have to worry about the in-memory edge case
        const {
            DB_FILE,
            AWS_REGION,
            AWS_BACKUP_BUCKET
        } = process.env;

        // setup AWS SDK for s3 sync of sqlite3 db
        AWS.config.update({
            region: AWS_REGION || "us-east-1" //default to us-east-1
        });
        // Create S3 service object
        this.s3 = new AWS.S3({
            apiVersion: '2006-03-01'
        });
        // check for sqlite3 DB file, don't init if we need to go to s3 first
        if (DB_FILE && AWS_REGION && AWS_BACKUP_BUCKET && !is_dir(DB_FILE)) {
            console.log(`${DB_FILE} does not exist`);
            this.s3.getObject({
                bucket: AWS_BACKUP_BUCKET,
                key: DB_FILE
            }, (error, data) => {
                if (error) {
                    console.log(error);
                    process.exit(1)
                }
                fs.writeFileSync(DB_FILE, data.Body);
                console.log(`${DB_FILE} loaded from ${AWS_BACKUP_BUCKET}`)
                this.db = new sqlite3.Database(DB_FILE || db_type);
            })
        } else {
            if (!DB_FILE) {
                console.log("WARNING: Using in memory DB")
            }
            this.db = new sqlite3.Database(DB_FILE || db_type);

        }
        // finally, init our sqllite db if the file already exists or we are using memory
    }
    // check if path exists
    is_dir(path) {
        try {
            const stat = fs.lstatSync(path);
            return stat.isDirectory();
        } catch (e) {
            // lstatSync throws an error if path doesn't exist
            return false;
        }
    }
    async backup(path = process.env.DB_FILE) {
        if (!fs.existsSync(path)) {
            return null;
        }
        this.s3.upload(params, function (err, data) {
            if (err) {
                throw err;
            }
            console.log(`File uploaded successfully. ${data.Location}`);
        });

    }
    // Given an array of pre-prepared SQL Statements, run then in order :) 
    createTables(ddl_statements) {
        const completed_opts = []
        while (ddl_statements.length > 0) {
            const sqlStatement = ddl_statements.pop()
            console.log(`Running "${sqlStatement}"`);
            try {
                this.db.run(sqlStatement);
            } catch (e) {
                console.error(`Unable to run ${sqlStatement}:`, e.message)
                break;
            }
            completed_opts.push(sqlStatement)
        }
        console.log("Completed operations:", completed_opts.length)
    }
    // Not for unsanitized SQL inputs https://xkcd.com/327/
    async query_unsafe(statement) {
        try {
            await this.db.run(statement);
        } catch (e) {
            console.error(`Unable to run ${statement}:`, e.message)
        }
        return null;
    }
    insertNewUser(email, userdatablob) {
        return new Promise((resolve, reject) => {
            this.db.run("INSERT INTO users(email,metadata) values (?,?)", email, JSON.stringify(userdatablob),
                (error, rows) => {
                    if (error) {
                        console.log(error)
                        return reject(error)
                    }
                    return resolve(rows)
                });
        })
    }
    updateUser(email, data) {
        const values = []
        return new Promise((resolve, reject) => {
            const updateMetadata = data.metadata ? "metadata = ?," : "";
            const apiKey = data.apiKey ? " api_key = ?," : "";
            const updateRooms = data.rooms ? "rooms = ? ," : "";
            if (updateMetadata.length) {
                values.push(data.metadata)
            }
            if (apiKey.length) {
                values.push(data.apiKey)
            }
            if (updateRooms.length) {
                values.push(JSON.stringify(data.rooms))
            }
            values.push(email)
            const query = `UPDATE users SET ${updateMetadata}${apiKey}${updateRooms} WHERE email = ?`;
            this.db.run(query, values, (result, error) => {
                if (error) {
                    return reject(error);
                }
                console.log(query, values)
                return resolve(result)
            });
        });
    }
    getUser(email) {
        return new Promise((resolve, reject) => {
            let stmt = this.db.prepare("SELECT * FROM users WHERE email=?");
            const results = []
            stmt.each(email, (error, row) => {
                if (error) {
                    return reject(error)
                }
                results.push(row);
                console.log(row.id, row.email);
            }, (error, count) => {
                if (error) {
                    return reject(error)
                }
                stmt.finalize();
                resolve(results);
            });
        })
    }
}

module.exports = new SimpleDB(process.env.DB_FILE)