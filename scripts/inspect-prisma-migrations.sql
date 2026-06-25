SELECT migration_name, finished_at, rolled_back_at, started_at,
       LEFT(logs, 200) AS logs_preview
FROM "_prisma_migrations"
ORDER BY started_at DESC
LIMIT 25;
