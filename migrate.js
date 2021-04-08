const fs = require('fs');
const DB = require('./db');

const setup_db = (ddl_path = process.env.DDL_PATH) => {
    console.log(`Searching for files to apply in ${ddl_path}`)
    fs.readdir(ddl_path, (error, filenames) => {
        if (error) {
            console.log(error);
            process.exit(1);
        }
        const migrations = filenames.filter(f => f.includes(".sql")).map((filename) => {
            const sql = fs.readFileSync(ddl_path + filename, "utf-8");
            return sql
        });
        DB.createTables(migrations);
    });
}
setup_db()