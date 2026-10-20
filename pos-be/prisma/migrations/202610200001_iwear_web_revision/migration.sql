-- Additive migration: keeps historical payments and stock references readable.
ALTER TABLE `products` ADD COLUMN `variant` VARCHAR(100) NULL, ADD COLUMN `color` VARCHAR(100) NULL;
ALTER TABLE `transaction_items` ADD COLUMN `loyalty_reward_qty` INTEGER NOT NULL DEFAULT 0, ADD COLUMN `loyalty_reward_discount` DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE `payments` MODIFY `payment_type` ENUM('CASH','QRIS','QRIS_MANUAL','TRANSFER','POINT') NOT NULL;
UPDATE `expenses` SET `category` = 'Konveksi' WHERE `category` = 'Bahan Baku';
UPDATE `expenses` SET `category` = 'Lainnya' WHERE `category` = 'Utilitas';
UPDATE `expenses` SET `type` = 'EXPENSE' WHERE `type` = 'PURCHASE';
UPDATE `store_settings` SET `enable_pre_order` = false, `enable_qris` = false;
