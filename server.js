// ==========================================================
// AmRash Medical Management System
// server.js
// ==========================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "amrash-secret-2026";

// ==========================================================
// APP CONFIG
// ==========================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ==========================================================
// DATABASE
// ==========================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "amrash",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==========================================================
// HELPERS
// ==========================================================

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function clean(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const valueTrimmed = value.trim();
    return valueTrimmed === "" ? null : valueTrimmed;
  }

  return value;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(value, fallback = "active") {
  const valueClean = clean(value);

  if (!valueClean) {
    return fallback;
  }

  return String(valueClean).trim();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول أولاً",
    });
  }

  const token = authHeader.substring(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "انتهت جلسة تسجيل الدخول",
    });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "ليس لديك صلاحية لتنفيذ هذه العملية",
    });
  }

  next();
}

async function createNotification(title, message) {
  try {
    await pool.query(
      `
            INSERT INTO notifications
            (title, message, is_read)
            VALUES (?, ?, 0)
            `,
      [title, message],
    );
  } catch (error) {
    console.error("تعذر إنشاء الإشعار:", error.message);
  }
}

// ==========================================================
// DATABASE TEST
// ==========================================================

async function testDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");
    console.log("Database connected successfully.");
  } finally {
    connection.release();
  }
}

// ==========================================================
// HEALTH
// ==========================================================

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "AmRash يعمل بشكل صحيح",
    });
  }),
);

// ==========================================================
// AUTH - LOGIN
// ==========================================================

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const username = clean(req.body.username || req.body.email);

    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        message: "اسم المستخدم وكلمة المرور مطلوبان",
      });
    }

    const [rows] = await pool.query(
      `
            SELECT
                id,
                name,
                username,
                email,
                password,
                role,
                phone,
                avatar,
                status,
                last_login,
                created_at
            FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
            `,
      [username, username],
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    const user = rows[0];

    if (user.status && String(user.status).toLowerCase() === "inactive") {
      return res.status(403).json({
        message: "هذا الحساب غير نشط",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    await pool.query(
      `
            UPDATE users
            SET last_login = NOW()
            WHERE id = ?
            `,
      [user.id],
    );

    delete user.password;

    const token = signToken(user);

    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user,
    });
  }),
);

// ==========================================================
// AUTH - REGISTER
// ==========================================================

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const name = clean(req.body.name);
    const username = clean(req.body.username);
    const email = clean(req.body.email);
    const password = req.body.password;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "جميع البيانات المطلوبة يجب إدخالها",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    const [existing] = await pool.query(
      `
            SELECT id
            FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
            `,
      [username, email],
    );

    if (existing.length) {
      return res.status(409).json({
        message: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
            INSERT INTO users
            (
                name,
                username,
                email,
                password,
                role,
                status
            )
            VALUES (?, ?, ?, ?, 'admin', 'active')
            `,
      [name, username, email, hashedPassword],
    );

    res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      userId: result.insertId,
    });
  }),
);

// ==========================================================
// AUTH - CURRENT USER
// ==========================================================

app.get(
  "/api/auth/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                id,
                name,
                username,
                email,
                role,
                phone,
                avatar,
                status,
                last_login,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
      [req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    res.json({
      success: true,
      user: rows[0],
    });
  }),
);

// ==========================================================
// AUTH - PROFILE
// ==========================================================

app.put(
  "/api/auth/profile",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const phone = clean(req.body.phone);

    const currentPassword = req.body.currentPassword;

    const newPassword = req.body.newPassword;

    const [rows] = await pool.query(
      `
            SELECT *
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
      [req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    const user = rows[0];

    if (name || email || phone) {
      await pool.query(
        `
                UPDATE users
                SET
                    name = COALESCE(?, name),
                    email = COALESCE(?, email),
                    phone = COALESCE(?, phone)
                WHERE id = ?
                `,
        [name, email, phone, req.user.id],
      );
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "أدخل كلمة المرور الحالية والجديدة",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);

      if (!valid) {
        return res.status(400).json({
          message: "كلمة المرور الحالية غير صحيحة",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query(
        `
                UPDATE users
                SET password = ?
                WHERE id = ?
                `,
        [hashedPassword, req.user.id],
      );
    }

    const [updatedRows] = await pool.query(
      `
            SELECT
                id,
                name,
                username,
                email,
                role,
                phone,
                avatar,
                status,
                last_login,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
      [req.user.id],
    );

    res.json({
      success: true,
      message: "تم تحديث البيانات بنجاح",
      user: updatedRows[0],
    });
  }),
);

// ==========================================================
// DEPARTMENTS - GET
// ==========================================================

app.get(
  "/api/departments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                d.id,
                d.department_name,
                d.description,
                d.status,
                d.icon,
                d.color,
                d.created_at,
                d.updated_at,

                (
                    SELECT COUNT(*)
                    FROM doctors dr
                    WHERE dr.department_id = d.id
                ) AS doctors_count,

                (
                    SELECT COUNT(*)
                    FROM patients p
                    WHERE p.department_id = d.id
                ) AS patients_count,

                (
                    SELECT COUNT(*)
                    FROM services s
                    WHERE s.department_id = d.id
                ) AS services_count

            FROM departments d
            ORDER BY d.id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// DEPARTMENTS - GET ONE
// ==========================================================

app.get(
  "/api/departments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `
            SELECT
                id,
                department_name,
                description,
                status,
                icon,
                color,
                created_at,
                updated_at
            FROM departments
            WHERE id = ?
            LIMIT 1
            `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "القسم غير موجود",
      });
    }

    res.json(rows[0]);
  }),
);

// ==========================================================
// DEPARTMENTS - CREATE
// ==========================================================

app.post(
  "/api/departments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = clean(req.body.department_name || req.body.name);

    const description = clean(req.body.description);

    const status = normalizeStatus(req.body.status, "Active");

    const icon = clean(req.body.icon);
    const color = clean(req.body.color);

    if (!name) {
      return res.status(400).json({
        message: "اسم القسم مطلوب",
      });
    }

    const [result] = await pool.query(
      `
            INSERT INTO departments
            (
                department_name,
                description,
                status,
                icon,
                color
            )
            VALUES (?, ?, ?, ?, ?)
            `,
      [name, description, status, icon, color],
    );

    await createNotification("قسم جديد", `تمت إضافة القسم: ${name}`);

    res.status(201).json({
      success: true,
      message: "تمت إضافة القسم بنجاح",
      id: result.insertId,
    });
  }),
);

// ==========================================================
// DEPARTMENTS - UPDATE
// ==========================================================

app.put(
  "/api/departments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const name = clean(req.body.department_name || req.body.name);

    const description = clean(req.body.description);

    const status = normalizeStatus(req.body.status, "Active");

    const icon = clean(req.body.icon);
    const color = clean(req.body.color);

    if (!id || !name) {
      return res.status(400).json({
        message: "بيانات القسم غير مكتملة",
      });
    }

    const [result] = await pool.query(
      `
            UPDATE departments
            SET
                department_name = ?,
                description = ?,
                status = ?,
                icon = ?,
                color = ?
            WHERE id = ?
            `,
      [name, description, status, icon, color, id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "القسم غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم تحديث القسم بنجاح",
    });
  }),
);

// ==========================================================
// DEPARTMENTS - DELETE
// ==========================================================

app.delete(
  "/api/departments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم القسم غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            DELETE FROM departments
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "القسم غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم حذف القسم بنجاح",
    });
  }),
);

// ==========================================================
// DOCTORS - GET
// ==========================================================

app.get(
  "/api/doctors",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                dr.id,
                dr.doctor_name,
                dr.specialty,
                dr.phone,
                dr.email,
                dr.gender,
                dr.department,
                dr.department_id,
                dr.consultation_fee,
                dr.bio,
                dr.status,
                dr.created_at,
                dr.updated_at,
                dep.department_name

            FROM doctors dr

            LEFT JOIN departments dep
                ON dep.id = dr.department_id

            ORDER BY dr.id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// DOCTORS - GET ONE
// ==========================================================

app.get(
  "/api/doctors/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `
            SELECT
                dr.*,
                dep.department_name
            FROM doctors dr
            LEFT JOIN departments dep
                ON dep.id = dr.department_id
            WHERE dr.id = ?
            LIMIT 1
            `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "الطبيب غير موجود",
      });
    }

    res.json(rows[0]);
  }),
);

// ==========================================================
// DOCTORS - CREATE
// ==========================================================

app.post(
  "/api/doctors",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = clean(req.body.doctor_name || req.body.name);

    const specialty = clean(req.body.specialty);

    const phone = clean(req.body.phone);
    const email = clean(req.body.email);
    const gender = clean(req.body.gender);

    const departmentId = numberOrNull(req.body.department_id);

    const consultationFee = numberOrNull(
      req.body.consultation_fee ?? req.body.fee,
    );

    const bio = clean(req.body.bio);

    const status = normalizeStatus(req.body.status, "Active");

    let departmentName = clean(req.body.department);

    if (!departmentName && departmentId) {
      const [departmentRows] = await pool.query(
        `
                    SELECT department_name
                    FROM departments
                    WHERE id = ?
                    LIMIT 1
                    `,
        [departmentId],
      );

      if (departmentRows.length) {
        departmentName = departmentRows[0].department_name;
      }
    }

    if (!name || !specialty) {
      return res.status(400).json({
        message: "اسم الطبيب والتخصص مطلوبان",
      });
    }

    const [result] = await pool.query(
      `
            INSERT INTO doctors
            (
                doctor_name,
                specialty,
                phone,
                email,
                gender,
                department,
                department_id,
                consultation_fee,
                bio,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
      [
        name,
        specialty,
        phone,
        email,
        gender,
        departmentName,
        departmentId,
        consultationFee || 0,
        bio,
        status,
      ],
    );

    await createNotification("طبيب جديد", `تمت إضافة الطبيب: ${name}`);

    res.status(201).json({
      success: true,
      message: "تمت إضافة الطبيب بنجاح",
      id: result.insertId,
    });
  }),
);

// ==========================================================
// DOCTORS - UPDATE
// ==========================================================

app.put(
  "/api/doctors/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const name = clean(req.body.doctor_name || req.body.name);

    const specialty = clean(req.body.specialty);

    const phone = clean(req.body.phone);
    const email = clean(req.body.email);
    const gender = clean(req.body.gender);

    const departmentId = numberOrNull(req.body.department_id);

    const consultationFee = numberOrNull(
      req.body.consultation_fee ?? req.body.fee,
    );

    const bio = clean(req.body.bio);

    const status = normalizeStatus(req.body.status, "Active");

    let departmentName = clean(req.body.department);

    if (!departmentName && departmentId) {
      const [departmentRows] = await pool.query(
        `
                    SELECT department_name
                    FROM departments
                    WHERE id = ?
                    LIMIT 1
                    `,
        [departmentId],
      );

      if (departmentRows.length) {
        departmentName = departmentRows[0].department_name;
      }
    }

    if (!id || !name || !specialty) {
      return res.status(400).json({
        message: "بيانات الطبيب غير مكتملة",
      });
    }

    const [result] = await pool.query(
      `
            UPDATE doctors
            SET
                doctor_name = ?,
                specialty = ?,
                phone = ?,
                email = ?,
                gender = ?,
                department = ?,
                department_id = ?,
                consultation_fee = ?,
                bio = ?,
                status = ?
            WHERE id = ?
            `,
      [
        name,
        specialty,
        phone,
        email,
        gender,
        departmentName,
        departmentId,
        consultationFee || 0,
        bio,
        status,
        id,
      ],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الطبيب غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم تحديث بيانات الطبيب بنجاح",
    });
  }),
);

// ==========================================================
// DOCTORS - DELETE
// ==========================================================

app.delete(
  "/api/doctors/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم الطبيب غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            DELETE FROM doctors
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الطبيب غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم حذف الطبيب بنجاح",
    });
  }),
);

// ==========================================================
// PATIENTS - GET
// ==========================================================

app.get(
  "/api/patients",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                p.id,
                p.file_number,
                p.patient_name,
                p.gender,
                p.birth_date,
                p.phone,
                p.email,
                p.address,
                p.blood_type,
                p.department,
                p.department_id,
                p.emergency_contact_name,
                p.emergency_contact_phone,
                p.occupation,
                p.marital_status,
                p.city,
                p.chronic_conditions,
                p.allergies,
                p.status,
                p.notes,
                p.created_at,
                p.updated_at,
                dep.department_name

            FROM patients p

            LEFT JOIN departments dep
                ON dep.id = p.department_id

            ORDER BY p.id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// PATIENTS - GET ONE
// ==========================================================

app.get(
  "/api/patients/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `
            SELECT
                p.*,
                dep.department_name
            FROM patients p
            LEFT JOIN departments dep
                ON dep.id = p.department_id
            WHERE p.id = ?
            LIMIT 1
            `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "المريض غير موجود",
      });
    }

    res.json(rows[0]);
  }),
);

// ==========================================================
// PATIENTS - CREATE
// ==========================================================

app.post(
  "/api/patients",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = clean(req.body.patient_name || req.body.name);

    const gender = clean(req.body.gender);
    const birthDate = clean(req.body.birth_date || req.body.dob);

    const phone = clean(req.body.phone);
    const email = clean(req.body.email);
    const address = clean(req.body.address);
    const bloodType = clean(req.body.blood_type || req.body.blood);

    const departmentId = numberOrNull(req.body.department_id);

    const emergencyName = clean(
      req.body.emergency_contact_name || req.body.emergency,
    );

    const emergencyPhone = clean(req.body.emergency_contact_phone);

    const occupation = clean(req.body.occupation);

    const maritalStatus = clean(req.body.marital_status);

    const city = clean(req.body.city);

    const chronicConditions = clean(
      req.body.chronic_conditions || req.body.chronic,
    );

    const allergies = clean(req.body.allergies);

    const status = normalizeStatus(req.body.status, "Active");

    const notes = clean(req.body.notes);

    let fileNumber = numberOrNull(req.body.file_number);

    if (!name) {
      return res.status(400).json({
        message: "اسم المريض مطلوب",
      });
    }

    if (!fileNumber) {
      const [rows] = await pool.query(
        `
                SELECT
                    COALESCE(
                        MAX(file_number),
                        0
                    ) + 1 AS next_number
                FROM patients
                `,
      );

      fileNumber = Number(rows[0].next_number) || 1;
    }

    let departmentName = clean(req.body.department);

    if (!departmentName && departmentId) {
      const [departmentRows] = await pool.query(
        `
                    SELECT department_name
                    FROM departments
                    WHERE id = ?
                    LIMIT 1
                    `,
        [departmentId],
      );

      if (departmentRows.length) {
        departmentName = departmentRows[0].department_name;
      }
    }

    const [result] = await pool.query(
      `
            INSERT INTO patients
            (
                file_number,
                patient_name,
                gender,
                birth_date,
                phone,
                email,
                address,
                blood_type,
                department,
                department_id,
                emergency_contact_name,
                emergency_contact_phone,
                occupation,
                marital_status,
                city,
                chronic_conditions,
                allergies,
                status,
                notes
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
      [
        fileNumber,
        name,
        gender,
        birthDate,
        phone,
        email,
        address,
        bloodType,
        departmentName,
        departmentId,
        emergencyName,
        emergencyPhone,
        occupation,
        maritalStatus,
        city,
        chronicConditions,
        allergies,
        status,
        notes,
      ],
    );

    await createNotification("مريض جديد", `تمت إضافة المريض: ${name}`);

    res.status(201).json({
      success: true,
      message: "تمت إضافة المريض بنجاح",
      id: result.insertId,
      file_number: fileNumber,
    });
  }),
);

// ==========================================================
// PATIENTS - UPDATE
// ==========================================================

app.put(
  "/api/patients/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const name = clean(req.body.patient_name || req.body.name);

    const gender = clean(req.body.gender);

    const birthDate = clean(req.body.birth_date || req.body.dob);

    const phone = clean(req.body.phone);
    const email = clean(req.body.email);
    const address = clean(req.body.address);

    const bloodType = clean(req.body.blood_type || req.body.blood);

    const departmentId = numberOrNull(req.body.department_id);

    const emergencyName = clean(
      req.body.emergency_contact_name || req.body.emergency,
    );

    const emergencyPhone = clean(req.body.emergency_contact_phone);

    const occupation = clean(req.body.occupation);

    const maritalStatus = clean(req.body.marital_status);

    const city = clean(req.body.city);

    const chronicConditions = clean(
      req.body.chronic_conditions || req.body.chronic,
    );

    const allergies = clean(req.body.allergies);

    const status = normalizeStatus(req.body.status, "Active");

    const notes = clean(req.body.notes);

    const fileNumber = numberOrNull(req.body.file_number);

    if (!id || !name) {
      return res.status(400).json({
        message: "بيانات المريض غير مكتملة",
      });
    }

    let departmentName = clean(req.body.department);

    if (!departmentName && departmentId) {
      const [departmentRows] = await pool.query(
        `
                    SELECT department_name
                    FROM departments
                    WHERE id = ?
                    LIMIT 1
                    `,
        [departmentId],
      );

      if (departmentRows.length) {
        departmentName = departmentRows[0].department_name;
      }
    }

    const [result] = await pool.query(
      `
            UPDATE patients
            SET
                file_number =
                    COALESCE(?, file_number),
                patient_name = ?,
                gender = ?,
                birth_date = ?,
                phone = ?,
                email = ?,
                address = ?,
                blood_type = ?,
                department = ?,
                department_id = ?,
                emergency_contact_name = ?,
                emergency_contact_phone = ?,
                occupation = ?,
                marital_status = ?,
                city = ?,
                chronic_conditions = ?,
                allergies = ?,
                status = ?,
                notes = ?
            WHERE id = ?
            `,
      [
        fileNumber,
        name,
        gender,
        birthDate,
        phone,
        email,
        address,
        bloodType,
        departmentName,
        departmentId,
        emergencyName,
        emergencyPhone,
        occupation,
        maritalStatus,
        city,
        chronicConditions,
        allergies,
        status,
        notes,
        id,
      ],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "المريض غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم تحديث بيانات المريض بنجاح",
    });
  }),
);

// ==========================================================
// PATIENTS - DELETE
// ==========================================================

app.delete(
  "/api/patients/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم المريض غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            DELETE FROM patients
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "المريض غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم حذف المريض بنجاح",
    });
  }),
);

// ==========================================================
// SERVICES - GET
// ==========================================================

app.get(
  "/api/services",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                s.id,
                s.service_name,
                s.description,
                s.price,
                s.status,
                s.department_id,
                s.duration_minutes,
                s.created_at,
                s.updated_at,
                d.department_name
            FROM services s
            LEFT JOIN departments d
                ON d.id = s.department_id
            ORDER BY s.id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// SERVICES - CREATE
// ==========================================================

app.post(
  "/api/services",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const serviceName = clean(req.body.service_name || req.body.name);

    const description = clean(req.body.description);

    const price = numberOrNull(req.body.price) || 0;

    const duration =
      numberOrNull(req.body.duration_minutes ?? req.body.duration) || 30;

    const departmentId = numberOrNull(req.body.department_id);

    const status = normalizeStatus(req.body.status, "Active");

    if (!serviceName) {
      return res.status(400).json({
        message: "اسم الخدمة مطلوب",
      });
    }

    const [result] = await pool.query(
      `
            INSERT INTO services
            (
                service_name,
                description,
                price,
                status,
                department_id,
                duration_minutes
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
      [serviceName, description, price, status, departmentId, duration],
    );

    res.status(201).json({
      success: true,
      message: "تمت إضافة الخدمة بنجاح",
      id: result.insertId,
    });
  }),
);

// ==========================================================
// SERVICES - UPDATE
// ==========================================================

app.put(
  "/api/services/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const serviceName = clean(req.body.service_name || req.body.name);

    const description = clean(req.body.description);

    const price = numberOrNull(req.body.price) || 0;

    const duration =
      numberOrNull(req.body.duration_minutes ?? req.body.duration) || 30;

    const departmentId = numberOrNull(req.body.department_id);

    const status = normalizeStatus(req.body.status, "Active");

    if (!id || !serviceName) {
      return res.status(400).json({
        message: "بيانات الخدمة غير مكتملة",
      });
    }

    const [result] = await pool.query(
      `
            UPDATE services
            SET
                service_name = ?,
                description = ?,
                price = ?,
                status = ?,
                department_id = ?,
                duration_minutes = ?
            WHERE id = ?
            `,
      [serviceName, description, price, status, departmentId, duration, id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الخدمة غير موجودة",
      });
    }

    res.json({
      success: true,
      message: "تم تحديث الخدمة بنجاح",
    });
  }),
);

// ==========================================================
// SERVICES - DELETE
// ==========================================================

app.delete(
  "/api/services/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم الخدمة غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            DELETE FROM services
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الخدمة غير موجودة",
      });
    }

    res.json({
      success: true,
      message: "تم حذف الخدمة بنجاح",
    });
  }),
);

// ==========================================================
// APPOINTMENTS - GET
// ==========================================================

app.get(
  "/api/appointments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                a.id,
                a.patient_id,
                a.doctor_id,
                a.department_id,
                a.service_id,
                a.type,
                a.created_by,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.notes,
                a.created_at,
                a.updated_at,

                p.patient_name,
                p.file_number,
                p.phone AS patient_phone,

                dr.doctor_name,

                dep.department_name,

                s.service_name

            FROM appointments a

            LEFT JOIN patients p
                ON p.id = a.patient_id

            LEFT JOIN doctors dr
                ON dr.id = a.doctor_id

            LEFT JOIN departments dep
                ON dep.id = a.department_id

            LEFT JOIN services s
                ON s.id = a.service_id

            ORDER BY
                a.appointment_date DESC,
                a.appointment_time DESC,
                a.id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// APPOINTMENTS - GET ONE
// ==========================================================

app.get(
  "/api/appointments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `
            SELECT
                a.*,
                p.patient_name,
                p.file_number,
                p.phone AS patient_phone,
                dr.doctor_name,
                dep.department_name,
                s.service_name
            FROM appointments a
            LEFT JOIN patients p
                ON p.id = a.patient_id
            LEFT JOIN doctors dr
                ON dr.id = a.doctor_id
            LEFT JOIN departments dep
                ON dep.id = a.department_id
            LEFT JOIN services s
                ON s.id = a.service_id
            WHERE a.id = ?
            LIMIT 1
            `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "الموعد غير موجود",
      });
    }

    res.json(rows[0]);
  }),
);

// ==========================================================
// APPOINTMENTS - CREATE
// ==========================================================

app.post(
  "/api/appointments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const patientId = numberOrNull(req.body.patient_id);

    const doctorId = numberOrNull(req.body.doctor_id);

    const departmentId = numberOrNull(req.body.department_id);

    const serviceId = numberOrNull(req.body.service_id);

    const type = clean(req.body.type);

    const appointmentDate = clean(req.body.appointment_date || req.body.date);

    const appointmentTime = clean(req.body.appointment_time || req.body.time);

    const status = normalizeStatus(req.body.status, "pending");

    const notes = clean(req.body.notes);

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        message: "المريض والطبيب والتاريخ والوقت مطلوبة",
      });
    }

    const [result] = await pool.query(
      `
            INSERT INTO appointments
            (
                patient_id,
                doctor_id,
                department_id,
                service_id,
                type,
                appointment_date,
                appointment_time,
                status,
                notes,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
      [
        patientId,
        doctorId,
        departmentId,
        serviceId,
        type,
        appointmentDate,
        appointmentTime,
        status,
        notes,
        req.user.id,
      ],
    );

    await createNotification("موعد جديد", "تمت إضافة موعد جديد إلى النظام.");

    res.status(201).json({
      success: true,
      message: "تمت إضافة الموعد بنجاح",
      id: result.insertId,
    });
  }),
);

// ==========================================================
// APPOINTMENTS - UPDATE
// ==========================================================

app.put(
  "/api/appointments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const patientId = numberOrNull(req.body.patient_id);

    const doctorId = numberOrNull(req.body.doctor_id);

    const departmentId = numberOrNull(req.body.department_id);

    const serviceId = numberOrNull(req.body.service_id);

    const type = clean(req.body.type);

    const appointmentDate = clean(req.body.appointment_date || req.body.date);

    const appointmentTime = clean(req.body.appointment_time || req.body.time);

    const status = normalizeStatus(req.body.status, "pending");

    const notes = clean(req.body.notes);

    if (
      !id ||
      !patientId ||
      !doctorId ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        message: "بيانات الموعد غير مكتملة",
      });
    }

    const [result] = await pool.query(
      `
            UPDATE appointments
            SET
                patient_id = ?,
                doctor_id = ?,
                department_id = ?,
                service_id = ?,
                type = ?,
                appointment_date = ?,
                appointment_time = ?,
                status = ?,
                notes = ?
            WHERE id = ?
            `,
      [
        patientId,
        doctorId,
        departmentId,
        serviceId,
        type,
        appointmentDate,
        appointmentTime,
        status,
        notes,
        id,
      ],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الموعد غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم تحديث الموعد بنجاح",
    });
  }),
);

// ==========================================================
// APPOINTMENTS - DELETE
// ==========================================================

app.delete(
  "/api/appointments/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم الموعد غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            DELETE FROM appointments
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الموعد غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم حذف الموعد بنجاح",
    });
  }),
);

// ==========================================================
// NOTIFICATIONS - GET
// ==========================================================

app.get(
  "/api/notifications",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                id,
                title,
                message,
                is_read,
                created_at
            FROM notifications
            ORDER BY
                is_read ASC,
                created_at DESC
            LIMIT 50
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// NOTIFICATIONS - MARK ALL READ
// ==========================================================

app.put(
  "/api/notifications/read",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await pool.query(
      `
            UPDATE notifications
            SET is_read = 1
            WHERE is_read = 0
            `,
    );

    res.json({
      success: true,
      message: "تم تعليم جميع الإشعارات كمقروءة",
    });
  }),
);

// ==========================================================
// NOTIFICATIONS - SINGLE READ
// ==========================================================

app.put(
  "/api/notifications/:id/read",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم الإشعار غير صحيح",
      });
    }

    const [result] = await pool.query(
      `
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
            `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "الإشعار غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم تعليم الإشعار كمقروء",
    });
  }),
);

// ==========================================================
// DASHBOARD STATS
// ==========================================================

app.get(
  "/api/stats",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [
      patients,
      doctors,
      departments,
      services,
      appointments,
      todayAppointments,
      activePatients,
      activeDoctors,
      activeServices,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM patients`),

      pool.query(`SELECT COUNT(*) AS total FROM doctors`),

      pool.query(`SELECT COUNT(*) AS total FROM departments`),

      pool.query(`SELECT COUNT(*) AS total FROM services`),

      pool.query(`SELECT COUNT(*) AS total FROM appointments`),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM appointments
                WHERE appointment_date = CURDATE()
                `,
      ),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM patients
                WHERE LOWER(status) IN ('active','نشط')
                `,
      ),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM doctors
                WHERE LOWER(status) IN ('active','نشط')
                `,
      ),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM services
                WHERE LOWER(status) IN ('active','نشط')
                `,
      ),
    ]);

    const result = {
      totalPatients: Number(patients[0][0].total),

      totalDoctors: Number(doctors[0][0].total),

      totalDepartments: Number(departments[0][0].total),

      totalServices: Number(services[0][0].total),

      totalAppointments: Number(appointments[0][0].total),

      todayAppointments: Number(todayAppointments[0][0].total),

      activePatients: Number(activePatients[0][0].total),

      activeDoctors: Number(activeDoctors[0][0].total),

      activeServices: Number(activeServices[0][0].total),
    };

    res.json({
      success: true,
      ...result,
      patients: result.totalPatients,
      doctors: result.totalDoctors,
      departments: result.totalDepartments,
      services: result.totalServices,
      appointments: result.totalAppointments,
    });
  }),
);

// ==========================================================
// DASHBOARD - TODAY APPOINTMENTS
// ==========================================================

app.get(
  "/api/dashboard/today-appointments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                p.patient_name,
                p.file_number,
                dr.doctor_name,
                dep.department_name,
                s.service_name
            FROM appointments a
            LEFT JOIN patients p
                ON p.id = a.patient_id
            LEFT JOIN doctors dr
                ON dr.id = a.doctor_id
            LEFT JOIN departments dep
                ON dep.id = a.department_id
            LEFT JOIN services s
                ON s.id = a.service_id
            WHERE a.appointment_date = CURDATE()
            ORDER BY a.appointment_time ASC
            LIMIT 20
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// DASHBOARD - RECENT PATIENTS
// ==========================================================

app.get(
  "/api/dashboard/recent-patients",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                p.id,
                p.file_number,
                p.patient_name,
                p.gender,
                p.phone,
                p.status,
                p.created_at,
                d.department_name
            FROM patients p
            LEFT JOIN departments d
                ON d.id = p.department_id
            ORDER BY p.id DESC
            LIMIT 10
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// DASHBOARD - RECENT APPOINTMENTS
// ==========================================================

app.get(
  "/api/dashboard/recent-appointments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                p.patient_name,
                p.file_number,
                dr.doctor_name,
                dep.department_name,
                s.service_name
            FROM appointments a
            LEFT JOIN patients p
                ON p.id = a.patient_id
            LEFT JOIN doctors dr
                ON dr.id = a.doctor_id
            LEFT JOIN departments dep
                ON dep.id = a.department_id
            LEFT JOIN services s
                ON s.id = a.service_id
            ORDER BY
                a.appointment_date DESC,
                a.appointment_time DESC,
                a.id DESC
            LIMIT 10
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// REPORTS SUMMARY
// ==========================================================

app.get(
  "/api/reports/summary",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const from = clean(req.query.from);
    const to = clean(req.query.to);
    const department = numberOrNull(req.query.department);

    let patientWhere = "";
    let appointmentWhere = "";

    const patientParams = [];
    const appointmentParams = [];

    if (from) {
      patientWhere += " AND DATE(p.created_at) >= ?";
      patientParams.push(from);
    }

    if (to) {
      patientWhere += " AND DATE(p.created_at) <= ?";
      patientParams.push(to);
    }

    if (department) {
      patientWhere += " AND p.department_id = ?";
      patientParams.push(department);
    }

    if (from) {
      appointmentWhere += " AND a.appointment_date >= ?";
      appointmentParams.push(from);
    }

    if (to) {
      appointmentWhere += " AND a.appointment_date <= ?";
      appointmentParams.push(to);
    }

    if (department) {
      appointmentWhere += " AND a.department_id = ?";
      appointmentParams.push(department);
    }

    const [
      totalPatients,
      totalAppointments,
      completedAppointments,
      totalDoctors,
      totalDepartments,
      totalServices,
    ] = await Promise.all([
      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM patients p
                WHERE 1 = 1
                ${patientWhere}
                `,
        patientParams,
      ),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM appointments a
                WHERE 1 = 1
                ${appointmentWhere}
                `,
        appointmentParams,
      ),

      pool.query(
        `
                SELECT COUNT(*) AS total
                FROM appointments a
                WHERE LOWER(a.status) IN
                (
                    'completed',
                    'complete',
                    'مكتمل'
                )
                ${appointmentWhere}
                `,
        appointmentParams,
      ),

      pool.query(`SELECT COUNT(*) AS total FROM doctors`),

      pool.query(`SELECT COUNT(*) AS total FROM departments`),

      pool.query(`SELECT COUNT(*) AS total FROM services`),
    ]);

    res.json({
      success: true,

      totalPatients: Number(totalPatients[0][0].total),

      totalAppointments: Number(totalAppointments[0][0].total),

      completedAppointments: Number(completedAppointments[0][0].total),

      totalDoctors: Number(totalDoctors[0][0].total),

      totalDepartments: Number(totalDepartments[0][0].total),

      totalServices: Number(totalServices[0][0].total),

      totalRevenue: 0,
    });
  }),
);

// ==========================================================
// SETTINGS - GET
// ==========================================================

app.get(
  "/api/settings",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                setting_key,
                setting_value,
                updated_at
            FROM settings
            ORDER BY setting_key
            `,
    );

    const settings = {};

    rows.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      success: true,
      settings,
    });
  }),
);

// ==========================================================
// SETTINGS - SAVE
// ==========================================================

app.put(
  "/api/settings",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const settings = req.body.settings || req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        message: "بيانات الإعدادات غير صحيحة",
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const [key, value] of Object.entries(settings)) {
        if (!key) continue;

        const finalValue =
          typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? "");

        await connection.query(
          `
                    INSERT INTO settings
                    (
                        setting_key,
                        setting_value
                    )
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE
                        setting_value =
                            VALUES(setting_value)
                    `,
          [key, finalValue],
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: "تم حفظ الإعدادات بنجاح",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

// ==========================================================
// USERS - GET
// ==========================================================

app.get(
  "/api/users",
  authMiddleware,
  adminOnly,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `
            SELECT
                id,
                name,
                username,
                email,
                role,
                phone,
                avatar,
                status,
                last_login,
                created_at,
                updated_at
            FROM users
            ORDER BY id DESC
            `,
    );

    res.json(rows);
  }),
);

// ==========================================================
// USERS - CREATE
// ==========================================================

app.post(
  "/api/users",
  authMiddleware,
  adminOnly,
  asyncHandler(async (req, res) => {
    const name = clean(req.body.name);
    const username = clean(req.body.username);
    const email = clean(req.body.email);
    const phone = clean(req.body.phone);
    const role = clean(req.body.role) || "admin";
    const status = clean(req.body.status) || "active";
    const password = req.body.password;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "الاسم واسم المستخدم والبريد وكلمة المرور مطلوبة",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    const [existing] = await pool.query(
      `
                SELECT id
                FROM users
                WHERE username = ?
                   OR email = ?
                LIMIT 1
                `,
      [username, email],
    );

    if (existing.length) {
      return res.status(409).json({
        message: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
                INSERT INTO users
                (
                    name,
                    username,
                    email,
                    password,
                    role,
                    phone,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
      [name, username, email, hashedPassword, role, phone, status],
    );

    res.status(201).json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      id: result.insertId,
    });
  }),
);

// ==========================================================
// USERS - UPDATE
// ==========================================================

app.put(
  "/api/users/:id",
  authMiddleware,
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const phone = clean(req.body.phone);
    const role = clean(req.body.role) || "admin";
    const status = clean(req.body.status) || "active";

    if (!id || !name || !email) {
      return res.status(400).json({
        message: "بيانات المستخدم غير مكتملة",
      });
    }

    await pool.query(
      `
            UPDATE users
            SET
                name = ?,
                email = ?,
                phone = ?,
                role = ?,
                status = ?
            WHERE id = ?
            `,
      [name, email, phone, role, status, id],
    );

    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({
          message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      await pool.query(
        `
                UPDATE users
                SET password = ?
                WHERE id = ?
                `,
        [hashedPassword, id],
      );
    }

    res.json({
      success: true,
      message: "تم تحديث المستخدم بنجاح",
    });
  }),
);

// ==========================================================
// USERS - DELETE
// ==========================================================

app.delete(
  "/api/users/:id",
  authMiddleware,
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "رقم المستخدم غير صحيح",
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        message: "لا يمكنك حذف حسابك الحالي",
      });
    }

    const [result] = await pool.query(
      `
                DELETE FROM users
                WHERE id = ?
                `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "المستخدم غير موجود",
      });
    }

    res.json({
      success: true,
      message: "تم حذف المستخدم بنجاح",
    });
  }),
);

// ==========================================================
// ROOT
// ==========================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ==========================================
   DASHBOARD API
========================================== */

    app.get("/api/dashboard", async (req, res) => {
      try {
        const [[patients]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM patients
        `);

        const [[doctors]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM doctors
        `);

        const [[departments]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM departments
        `);

        const [[services]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM services
        `);

        const [[appointments]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM appointments
        `);

        const [[todayAppointments]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM appointments
            WHERE DATE(appointment_date) = CURDATE()
        `);

        res.json({
          success: true,

          statistics: {
            patients: patients.total,

            doctors: doctors.total,

            departments: departments.total,

            services: services.total,

            appointments: appointments.total,

            todayAppointments: todayAppointments.total,
          },
        });
      } catch (error) {
        console.error("Dashboard error:", error);
console.error("Dashboard error details:", error.message);
        res.status(500).json({
          success: false,

          message: "حدث خطأ أثناء تحميل بيانات لوحة التحكم",
        });
      }
    });

// ==========================================================
// PROFILE API
// ==========================================================

// جلب بيانات المستخدم الحالي
app.get("/api/profile", authMiddleware, asyncHandler(async (req, res) => {

  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        username,
        email,
        role,
        phone,
        avatar,
        status,
        last_login,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      success: false,
      message: "المستخدم غير موجود",
    });
  }

  res.json({
    success: true,
    user: rows[0],
  });

}));


// تحديث البيانات الشخصية
app.put("/api/profile", authMiddleware, asyncHandler(async (req, res) => {

  const name = clean(req.body.name || "");
  const email = clean(req.body.email || "");
  const phone = clean(req.body.phone || "");

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "الاسم والبريد الإلكتروني مطلوبان",
    });
  }

  await pool.query(
    `
      UPDATE users
      SET
        name = ?,
        email = ?,
        phone = ?
      WHERE id = ?
    `,
    [
      name,
      email,
      phone || null,
      req.user.id,
    ]
  );

  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        username,
        email,
        role,
        phone,
        avatar,
        status,
        last_login,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [req.user.id]
  );

  res.json({
    success: true,
    message: "تم تحديث بيانات الملف الشخصي بنجاح",
    user: rows[0],
  });

}));


// تغيير كلمة المرور
app.put("/api/profile/password", authMiddleware, asyncHandler(async (req, res) => {

  const currentPassword = req.body.currentPassword || "";
  const newPassword = req.body.newPassword || "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الحالية والجديدة مطلوبتان",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    });
  }

  const [rows] = await pool.query(
    `
      SELECT password
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      success: false,
      message: "المستخدم غير موجود",
    });
  }

  const validPassword = await bcrypt.compare(
    currentPassword,
    rows[0].password
  );

  if (!validPassword) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الحالية غير صحيحة",
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `
      UPDATE users
      SET password = ?
      WHERE id = ?
    `,
    [
      hashedPassword,
      req.user.id,
    ]
  );

  res.json({
    success: true,
    message: "تم تغيير كلمة المرور بنجاح",
  });

}));

// ==========================================================
// API 404
// ==========================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "مسار API غير موجود",
  });
});


// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "البيانات موجودة بالفعل",
    });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      message: "البيانات المرتبطة غير موجودة في قاعدة البيانات",
    });
  }

  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(400).json({
      message: "لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات أخرى",
    });
  }

  res.status(500).json({
    message: "حدث خطأ داخلي في الخادم",
  });
});


// ==========================================================
// START SERVER
// ==========================================================

async function startServer() {
  try {
    await testDatabase();

    app.listen(PORT, () => {
      console.log(`AmRash server running at: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);

    process.exit(1);
  }
}



startServer();
