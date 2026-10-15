-- Additive, non-destructive migration for the LitePOS platform dashboard.
-- Tenant users remain in `users`; platform administrators use separate tables.

CREATE TABLE `platform_admins` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `platform_admins_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `platform_admin_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `jwt_id` VARCHAR(64) NOT NULL,
  `admin_id` INTEGER NOT NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `revoke_reason` VARCHAR(100) NULL,
  UNIQUE INDEX `platform_admin_sessions_jwt_id_key`(`jwt_id`),
  INDEX `platform_admin_sessions_admin_id_revoked_at_idx`(`admin_id`, `revoked_at`),
  INDEX `platform_admin_sessions_last_seen_at_idx`(`last_seen_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `platform_admin_sessions_admin_id_fkey`
    FOREIGN KEY (`admin_id`) REFERENCES `platform_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `platform_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `request_id` VARCHAR(100) NULL,
  `admin_id` INTEGER NULL,
  `action` VARCHAR(80) NOT NULL,
  `target_type` VARCHAR(60) NOT NULL,
  `target_id` VARCHAR(100) NULL,
  `details` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `platform_audit_logs_request_id_key`(`request_id`),
  INDEX `platform_audit_logs_admin_id_created_at_idx`(`admin_id`, `created_at`),
  INDEX `platform_audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `platform_audit_logs_admin_id_fkey`
    FOREIGN KEY (`admin_id`) REFERENCES `platform_admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
