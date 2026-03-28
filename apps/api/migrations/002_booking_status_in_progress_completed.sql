-- PostgreSQL: новые значения enum колонки status у bookings (при synchronize: false).
-- Имя типа проверьте: \d bookings в psql (часто bookings_status_enum).
-- Выполнить один раз на окружении.

ALTER TYPE bookings_status_enum ADD VALUE 'in_progress';
ALTER TYPE bookings_status_enum ADD VALUE 'completed';

-- Разовая подгонка старых строк (опционально):
-- UPDATE bookings SET status = 'completed'
-- WHERE status = 'confirmed' AND ends_at < NOW();
-- UPDATE bookings SET status = 'in_progress'
-- WHERE status = 'confirmed' AND starts_at <= NOW() AND ends_at > NOW();
