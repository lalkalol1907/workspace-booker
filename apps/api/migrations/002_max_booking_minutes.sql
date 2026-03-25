-- Опциональное ограничение максимальной длительности одной брони для каждого ресурса.
-- Значение в минутах. NULL = без ограничения.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS max_booking_minutes int NULL;

