DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `status` varchar(30) DEFAULT 'Scheduled',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `service_id` int DEFAULT NULL,
  `type` varchar(80) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `department_id` (`department_id`),
  KEY `fk_appointments_service` (`service_id`),
  KEY `fk_appointments_created_by` (`created_by`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appointments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(150) NOT NULL,
  `description` text,
  `status` varchar(30) DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_name` (`department_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `departments` (`id`, `department_name`, `description`, `status`, `created_at`, `icon`, `color`, `updated_at`) VALUES (1, 'الباطنية', 'الباطنية', 'active', '2026-10-03 18:54:47.000', 'bi-bandaid', NULL, '2026-10-03 18:58:54.000');
INSERT INTO `departments` (`id`, `department_name`, `description`, `status`, `created_at`, `icon`, `color`, `updated_at`) VALUES (2, 'القلب', 'القلب', 'active', '2026-10-03 18:58:28.000', 'bi-heart-pulse', NULL, '2026-10-03 18:58:28.000');

DROP TABLE IF EXISTS `doctors`;
CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_name` varchar(150) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `department_id` int DEFAULT NULL,
  `consultation_fee` decimal(10,2) DEFAULT '0.00',
  `bio` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_doctors_department` (`department_id`),
  CONSTRAINT `fk_doctors_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(160) NOT NULL,
  `message` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `notifications` (`id`, `title`, `message`, `is_read`, `created_at`) VALUES (1, 'قسم جديد', 'تمت إضافة القسم: الباطنية', 0, '2026-10-03 18:54:47.000');
INSERT INTO `notifications` (`id`, `title`, `message`, `is_read`, `created_at`) VALUES (2, 'قسم جديد', 'تمت إضافة القسم: القلب', 0, '2026-10-03 18:58:28.000');
INSERT INTO `notifications` (`id`, `title`, `message`, `is_read`, `created_at`) VALUES (3, 'مريض جديد', 'تمت إضافة المريض: ammo', 0, '2026-10-03 19:09:23.000');
INSERT INTO `notifications` (`id`, `title`, `message`, `is_read`, `created_at`) VALUES (4, 'طبيب جديد', 'تمت إضافة الطبيب: hokjhg,gk', 0, '2026-10-03 19:10:54.000');

DROP TABLE IF EXISTS `patients`;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_number` int NOT NULL,
  `patient_name` varchar(150) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` varchar(250) DEFAULT NULL,
  `blood_type` varchar(10) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'نشط',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `department_id` int DEFAULT NULL,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_phone` varchar(30) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `marital_status` varchar(30) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `chronic_conditions` text,
  `allergies` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_number` (`file_number`),
  UNIQUE KEY `unique_file_number` (`file_number`),
  KEY `fk_patients_department` (`department_id`),
  CONSTRAINT `fk_patients_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_type` varchar(100) NOT NULL,
  `report_title` varchar(200) NOT NULL,
  `report_date` date NOT NULL,
  `description` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_name` varchar(150) NOT NULL,
  `description` text,
  `price` decimal(10,2) DEFAULT '0.00',
  `status` varchar(30) DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `department_id` int DEFAULT NULL,
  `duration_minutes` int DEFAULT '30',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_name` (`service_name`),
  KEY `fk_services_department` (`department_id`),
  CONSTRAINT `fk_services_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `username` varchar(80) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(40) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (`id`, `name`, `username`, `email`, `password`, `role`, `created_at`, `phone`, `avatar`, `status`, `last_login`, `updated_at`) VALUES (1, 'Amal Rashed', 'admin', 'amlrashd430@gmail.com', '$2a$10$DC6H8YG/OPtDujZqcSrv2.TeBiMw/oS52dGKOa8RDGnV.zwCobNVK', 'admin', '2026-10-01 12:29:10.000', NULL, NULL, 'active', '2026-10-04 08:29:31.000', '2026-10-04 08:29:31.000');

