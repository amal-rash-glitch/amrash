const mysql = require("mysql2/promise");
const fs = require("fs");

require("dotenv").config();

async function importDatabase() {
  let db;

  try {
    const sql = fs.readFileSync("amrash-backup.sql", "utf8");

    console.log("Connecting to Aiven...");

    db = await mysql.createConnection({
      host: process.env.AIVEN_DB_HOST,
      user: process.env.AIVEN_DB_USER,
      password: process.env.AIVEN_DB_PASSWORD,
      database: process.env.AIVEN_DB_NAME,
      port: Number(process.env.AIVEN_DB_PORT),
      ssl: {
        rejectUnauthorized: false,
      },
      multipleStatements: true,
    });

    console.log("Connected to Aiven.");
    console.log("Importing AmRash database...");

    // تعطيل فحص العلاقات مؤقتًا أثناء الاستيراد
    await db.query("SET FOREIGN_KEY_CHECKS = 0;");

    await db.query(sql);

    // إعادة فحص العلاقات بعد انتهاء الاستيراد
    await db.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("================================");
    console.log("AmRash database imported successfully.");
    console.log("================================");
  } catch (error) {
    console.error("Import failed:");
    console.error(error.message);

    if (db) {
      try {
        await db.query("SET FOREIGN_KEY_CHECKS = 1;");
      } catch {}
    }
  } finally {
    if (db) {
      await db.end();
    }
  }
}

importDatabase();
