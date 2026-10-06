require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const pool = mysql.createPool({
    host: process.env.AIVEN_DB_HOST,
    port: Number(process.env.AIVEN_DB_PORT),
    user: process.env.AIVEN_DB_USER,
    password: process.env.AIVEN_DB_PASSWORD,
    database: process.env.AIVEN_DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const password = "123456";
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `
    INSERT INTO users
      (name, username, email, password, role, status)
    VALUES
      (?, ?, ?, ?, ?, ?)
    `,
    ["Administrator", "admin", "admin@amrash.com", hash, "admin", "active"],
  );

  console.log("تم إنشاء حساب admin بنجاح");
  console.log("Email: admin@amrash.com");
  console.log("Password: 123456");

  await pool.end();
}

createAdmin().catch((error) => {
  console.error("حدث خطأ:", error.message);
});
