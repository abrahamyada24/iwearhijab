-- Non-destructive multi-store migration for the existing MySQL schema.
-- Existing records are assigned to one "legacy" store before columns become required.

CREATE TABLE `stores` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(80) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('RETAIL', 'LAUNDRY') NOT NULL DEFAULT 'RETAIL',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `is_public_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `stores_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `stores` (`slug`, `name`, `type`, `is_active`, `is_public_demo`, `updated_at`)
VALUES ('legacy-store', 'Usaha Lama', 'RETAIL', true, false, CURRENT_TIMESTAMP(3));

CREATE TABLE `store_memberships` (
  `user_id` INTEGER NOT NULL,
  `store_id` INTEGER NOT NULL,
  `role` ENUM('OWNER', 'ADMIN', 'CASHIER') NOT NULL DEFAULT 'CASHIER',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `store_memberships_store_id_is_active_idx`(`store_id`, `is_active`),
  PRIMARY KEY (`user_id`, `store_id`),
  CONSTRAINT `store_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `store_memberships_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `store_memberships` (`user_id`, `store_id`, `role`, `is_active`, `updated_at`)
SELECT `id`, (SELECT `id` FROM `stores` WHERE `slug` = 'legacy-store'), `role`, `is_active`, CURRENT_TIMESTAMP(3)
FROM `users`;

ALTER TABLE `auth_sessions` ADD COLUMN `active_store_id` INTEGER NULL;
UPDATE `auth_sessions` SET `active_store_id` = (SELECT `id` FROM `stores` WHERE `slug` = 'legacy-store');
CREATE INDEX `auth_sessions_active_store_id_idx` ON `auth_sessions`(`active_store_id`);
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_active_store_id_fkey` FOREIGN KEY (`active_store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_licenses` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `categories` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `products` ADD COLUMN `store_id` INTEGER NULL, ADD COLUMN `unit_label` VARCHAR(30) NOT NULL DEFAULT 'item';
ALTER TABLE `customers` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `transactions` ADD COLUMN `store_id` INTEGER NULL, ADD COLUMN `work_status` ENUM('RECEIVED', 'PROCESSING', 'READY', 'PICKED_UP') NULL;
ALTER TABLE `stock_movements` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `store_settings` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `loyalty_config` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `expenses` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `shifts` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `saved_transactions` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `stock_receipts` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `product_addons` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `dine_tables` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `packages` ADD COLUMN `store_id` INTEGER NULL;
ALTER TABLE `suppliers` ADD COLUMN `store_id` INTEGER NULL;

SET @legacy_store_id = (SELECT `id` FROM `stores` WHERE `slug` = 'legacy-store');
UPDATE `store_licenses` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `categories` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `products` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `customers` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `transactions` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `stock_movements` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `store_settings` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `loyalty_config` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `expenses` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `shifts` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `saved_transactions` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `stock_receipts` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `product_addons` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `dine_tables` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `packages` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;
UPDATE `suppliers` SET `store_id` = @legacy_store_id WHERE `store_id` IS NULL;

ALTER TABLE `store_licenses` MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT, MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `categories` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `products` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `customers` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `transactions` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `stock_movements` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `store_settings` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `loyalty_config` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `expenses` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `shifts` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `saved_transactions` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `stock_receipts` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `product_addons` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `dine_tables` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `packages` MODIFY `store_id` INTEGER NOT NULL;
ALTER TABLE `suppliers` MODIFY `store_id` INTEGER NOT NULL;

CREATE UNIQUE INDEX `store_licenses_store_id_key` ON `store_licenses`(`store_id`);
CREATE UNIQUE INDEX `store_settings_store_id_key` ON `store_settings`(`store_id`);
CREATE UNIQUE INDEX `loyalty_config_store_id_key` ON `loyalty_config`(`store_id`);
CREATE INDEX `categories_store_id_idx` ON `categories`(`store_id`);
CREATE INDEX `products_store_id_idx` ON `products`(`store_id`);
CREATE INDEX `customers_store_id_idx` ON `customers`(`store_id`);
CREATE INDEX `transactions_store_id_created_at_idx` ON `transactions`(`store_id`, `created_at`);
CREATE INDEX `stock_movements_store_id_created_at_idx` ON `stock_movements`(`store_id`, `created_at`);
CREATE INDEX `expenses_store_id_created_at_idx` ON `expenses`(`store_id`, `created_at`);
CREATE INDEX `shifts_store_id_status_idx` ON `shifts`(`store_id`, `status`);
CREATE INDEX `saved_transactions_store_id_created_at_idx` ON `saved_transactions`(`store_id`, `created_at`);
CREATE INDEX `stock_receipts_store_id_received_at_idx` ON `stock_receipts`(`store_id`, `received_at`);
CREATE INDEX `product_addons_store_id_product_id_idx` ON `product_addons`(`store_id`, `product_id`);
CREATE INDEX `dine_tables_store_id_idx` ON `dine_tables`(`store_id`);
CREATE INDEX `packages_store_id_idx` ON `packages`(`store_id`);
CREATE INDEX `suppliers_store_id_idx` ON `suppliers`(`store_id`);

ALTER TABLE `store_licenses` ADD CONSTRAINT `store_licenses_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `categories` ADD CONSTRAINT `categories_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `products` ADD CONSTRAINT `products_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `customers` ADD CONSTRAINT `customers_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `store_settings` ADD CONSTRAINT `store_settings_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `loyalty_config` ADD CONSTRAINT `loyalty_config_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `saved_transactions` ADD CONSTRAINT `saved_transactions_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stock_receipts` ADD CONSTRAINT `stock_receipts_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `product_addons` ADD CONSTRAINT `product_addons_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dine_tables` ADD CONSTRAINT `dine_tables_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `packages` ADD CONSTRAINT `packages_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
