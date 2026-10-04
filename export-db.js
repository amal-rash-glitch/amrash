const mysql = require("mysql2/promise");
const fs = require("fs");

require("dotenv").config();

async function exportDatabase() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  console.log("Connected to database.");

  const [tables] = await db.query("SHOW TABLES");

  let sql = "";

  for (const row of tables) {
    const tableName = Object.values(row)[0];

    console.log(`Exporting: ${tableName}`);

    const [createTable] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);

    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sql += `${createTable[0]["Create Table"]};\n\n`;

    const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);

    for (const rowData of rows) {
      const columns = Object.keys(rowData)
        .map((column) => `\`${column}\``)
        .join(", ");

      const values = Object.values(rowData)
        .map((value) => mysql.escape(value))
        .join(", ");

      sql += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
    }

    sql += "\n";
  }

  fs.writeFileSync("amrash-backup.sql", sql, "utf8");

  await db.end();

  console.log("================================");
  console.log("Database export completed.");
  console.log("File created: amrash-backup.sql");
  console.log("================================");
}

exportDatabase().catch((error) => {
  console.error("Export failed:");
  console.error(error.message);
});
