-- =========================================================
-- AmRash Medical Management System
-- DATABASE SCHEMA - VERSION 2
-- =========================================================

CREATE DATABASE IF NOT EXISTS amrash
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE amrash;

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. USERS
-- =========================================================

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS laboratory_results;
DROP TABLE IF EXISTS laboratory_orders;
DROP TABLE IF EXISTS radiology_reports;
DROP TABLE IF EXISTS radiology_orders;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    username VARCHAR(80) NOT NULL UNIQUE,

    email VARCHAR(150) NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM(
        'admin',
        'manager',
        'doctor',
        'reception',
        'accountant',
        'pharmacist',
        'laboratory'
    ) NOT NULL DEFAULT 'reception',

    phone VARCHAR(40) NULL,

    avatar VARCHAR(255) NULL,

    status ENUM('active','inactive') NOT NULL DEFAULT 'active',

    last_login DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================================
-- 2. DEPARTMENTS
-- =========================================================

CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT NULL,

    icon VARCHAR(100) NULL,

    color VARCHAR(30) NULL,

    status ENUM('active','inactive') NOT NULL DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================================
-- 3. DOCTORS
-- =========================================================

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    specialty VARCHAR(150) NULL,

    phone VARCHAR(40) NULL,

    email VARCHAR(150) NULL,

    gender ENUM('male','female') NULL,

    license_number VARCHAR(100) NULL,

    department_id INT NULL,

    user_id INT NULL,

    consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

    status ENUM('active','inactive','on_leave')
        NOT NULL DEFAULT 'active',

    bio TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_doctors_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_doctors_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 4. PATIENTS
-- =========================================================

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,

    file_number VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    national_id VARCHAR(100) NULL,

    gender ENUM('male','female') NULL,

    birth_date DATE NULL,

    phone VARCHAR(40) NULL,

    email VARCHAR(150) NULL,

    address VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    blood_type VARCHAR(10) NULL,

    marital_status VARCHAR(50) NULL,

    occupation VARCHAR(100) NULL,

    emergency_contact_name VARCHAR(150) NULL,

    emergency_contact_phone VARCHAR(40) NULL,

    department_id INT NULL,

    status ENUM('active','inactive')
        NOT NULL DEFAULT 'active',

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_patients_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 5. SERVICES
-- =========================================================

CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT NULL,

    department_id INT NULL,

    price DECIMAL(10,2) NOT NULL DEFAULT 0,

    duration_minutes INT NOT NULL DEFAULT 30,

    status ENUM('active','inactive')
        NOT NULL DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_services_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 6. APPOINTMENTS
-- =========================================================

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    doctor_id INT NOT NULL,

    department_id INT NULL,

    service_id INT NULL,

    appointment_date DATE NOT NULL,

    appointment_time TIME NOT NULL,

    type VARCHAR(80) NULL,

    status ENUM(
        'waiting',
        'confirmed',
        'completed',
        'cancelled',
        'no_show'
    ) NOT NULL DEFAULT 'waiting',

    notes TEXT NULL,

    created_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_appointments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_appointments_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_appointments_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_service
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 7. MEDICAL RECORDS
-- =========================================================

CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    doctor_id INT NULL,

    appointment_id INT NULL,

    visit_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    chief_complaint TEXT NULL,

    diagnosis TEXT NULL,

    treatment TEXT NULL,

    symptoms TEXT NULL,

    blood_pressure VARCHAR(30) NULL,

    heart_rate VARCHAR(30) NULL,

    temperature VARCHAR(30) NULL,

    respiratory_rate VARCHAR(30) NULL,

    oxygen_saturation VARCHAR(30) NULL,

    weight VARCHAR(30) NULL,

    height VARCHAR(30) NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_medical_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_medical_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_medical_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 8. MEDICINES
-- =========================================================

CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    generic_name VARCHAR(150) NULL,

    category VARCHAR(100) NULL,

    manufacturer VARCHAR(150) NULL,

    unit VARCHAR(50) NULL,

    quantity INT NOT NULL DEFAULT 0,

    minimum_quantity INT NOT NULL DEFAULT 0,

    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    expiry_date DATE NULL,

    batch_number VARCHAR(100) NULL,

    status ENUM('active','inactive')
        NOT NULL DEFAULT 'active',

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================================
-- 9. PRESCRIPTIONS
-- =========================================================

CREATE TABLE prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    doctor_id INT NULL,

    medical_record_id INT NULL,

    prescription_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    diagnosis TEXT NULL,

    notes TEXT NULL,

    status ENUM('active','completed','cancelled')
        NOT NULL DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prescriptions_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prescriptions_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_prescriptions_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 10. PRESCRIPTION ITEMS
-- =========================================================

CREATE TABLE prescription_items (
    id INT AUTO_INCREMENT PRIMARY KEY,

    prescription_id INT NOT NULL,

    medicine_id INT NULL,

    medicine_name VARCHAR(150) NOT NULL,

    dosage VARCHAR(100) NULL,

    frequency VARCHAR(100) NULL,

    duration VARCHAR(100) NULL,

    quantity INT NULL,

    instructions TEXT NULL,

    CONSTRAINT fk_prescription_items_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescriptions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prescription_items_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 11. LABORATORY ORDERS
-- =========================================================

CREATE TABLE laboratory_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    doctor_id INT NULL,

    medical_record_id INT NULL,

    test_name VARCHAR(200) NOT NULL,

    priority ENUM('normal','urgent')
        NOT NULL DEFAULT 'normal',

    status ENUM(
        'requested',
        'sample_collected',
        'processing',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'requested',

    requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lab_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lab_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_lab_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 12. LABORATORY RESULTS
-- =========================================================

CREATE TABLE laboratory_results (
    id INT AUTO_INCREMENT PRIMARY KEY,

    laboratory_order_id INT NOT NULL,

    result TEXT NULL,

    reference_range VARCHAR(255) NULL,

    unit VARCHAR(50) NULL,

    result_status VARCHAR(50) NULL,

    attachment VARCHAR(255) NULL,

    completed_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lab_result_order
        FOREIGN KEY (laboratory_order_id)
        REFERENCES laboratory_orders(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 13. RADIOLOGY ORDERS
-- =========================================================

CREATE TABLE radiology_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id INT NOT NULL,

    doctor_id INT NULL,

    medical_record_id INT NULL,

    examination VARCHAR(200) NOT NULL,

    body_part VARCHAR(150) NULL,

    priority ENUM('normal','urgent')
        NOT NULL DEFAULT 'normal',

    status ENUM(
        'requested',
        'scheduled',
        'processing',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'requested',

    requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_radiology_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_radiology_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_radiology_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 14. RADIOLOGY REPORTS
-- =========================================================

CREATE TABLE radiology_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,

    radiology_order_id INT NOT NULL,

    findings TEXT NULL,

    impression TEXT NULL,

    attachment VARCHAR(255) NULL,

    reported_by INT NULL,

    reported_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_radiology_report_order
        FOREIGN KEY (radiology_order_id)
        REFERENCES radiology_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_radiology_report_user
        FOREIGN KEY (reported_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 15. INVOICES
-- =========================================================

CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    invoice_number VARCHAR(50) NOT NULL UNIQUE,

    patient_id INT NULL,

    appointment_id INT NULL,

    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,

    discount DECIMAL(12,2) NOT NULL DEFAULT 0,

    tax DECIMAL(12,2) NOT NULL DEFAULT 0,

    total DECIMAL(12,2) NOT NULL DEFAULT 0,

    paid DECIMAL(12,2) NOT NULL DEFAULT 0,

    remaining DECIMAL(12,2) NOT NULL DEFAULT 0,

    payment_method VARCHAR(50) NULL,

    status ENUM(
        'unpaid',
        'partial',
        'paid',
        'cancelled'
    ) NOT NULL DEFAULT 'unpaid',

    invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    created_by INT NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoice_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 16. INVOICE ITEMS
-- =========================================================

CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,

    invoice_id INT NOT NULL,

    service_id INT NULL,

    description VARCHAR(255) NOT NULL,

    quantity INT NOT NULL DEFAULT 1,

    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,

    total DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_invoice_items_service
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 17. EXPENSES
-- =========================================================

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(200) NOT NULL,

    category VARCHAR(100) NULL,

    amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    payment_method VARCHAR(50) NULL,

    expense_date DATE NOT NULL,

    description TEXT NULL,

    created_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expenses_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 18. NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NULL,

    title VARCHAR(200) NOT NULL,

    message TEXT NULL,

    type VARCHAR(50) NULL,

    reference_type VARCHAR(50) NULL,

    reference_id INT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 19. ACTIVITY LOGS
-- =========================================================

CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NULL,

    action VARCHAR(100) NOT NULL,

    module VARCHAR(100) NULL,

    description TEXT NULL,

    reference_id INT NULL,

    ip_address VARCHAR(100) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 20. DEFAULT DEPARTMENTS
-- =========================================================

INSERT INTO departments
(name, description, icon, color)
VALUES
('الباطنية',
 'قسم متخصص في تشخيص وعلاج الأمراض الباطنية.',
 'bi-heart-pulse',
 'blue'),

('الأطفال',
 'قسم متخصص في رعاية وتشخيص وعلاج الأطفال.',
 'bi-balloon',
 'cyan'),

('النساء والولادة',
 'قسم متخصص في صحة المرأة ورعاية الحمل والولادة.',
 'bi-gender-female',
 'rose'),

('الأسنان',
 'قسم متخصص في خدمات طب الأسنان.',
 'bi-emoji-smile',
 'purple'),

('الطوارئ',
 'قسم استقبال الحالات والطوارئ الطبية.',
 'bi-plus-circle',
 'red'),

('الجلدية',
 'قسم متخصص في تشخيص وعلاج الأمراض الجلدية.',
 'bi-person-badge',
 'orange');


-- =========================================================
-- 21. DEFAULT SERVICES
-- =========================================================

INSERT INTO services
(name, description, price, duration_minutes)
VALUES
('كشف طبي عام', 'استشارة وفحص طبي عام.', 0, 30),
('كشف باطنية', 'استشارة طبيب باطنية.', 0, 30),
('كشف أطفال', 'استشارة وفحص طبي للأطفال.', 0, 30),
('كشف أسنان', 'فحص واستشارة طب الأسنان.', 0, 30),
('متابعة طبية', 'زيارة متابعة للحالة الصحية.', 0, 20);


-- =========================================================
-- 22. DEFAULT ADMIN
-- Password will be replaced by server.js
-- =========================================================

INSERT INTO users
(name, username, email, password, role, status)
VALUES
(
    'AmRash Administrator',
    'admin',
    'admin@amrash.local',
    'CHANGE_BY_SERVER',
    'admin',
    'active'
);


-- =========================================================
-- FINISH
-- =========================================================

SET FOREIGN_KEY_CHECKS = 1;