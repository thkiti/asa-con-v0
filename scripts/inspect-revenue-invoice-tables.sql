-- Check whether REV / INV objects exist in the live database
SELECT typname AS enum_name
FROM pg_type
WHERE typname IN ('RevenueVoucherStatus', 'InvoiceVoucherStatus')
ORDER BY typname;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('RevenueVoucher', 'RevenueVoucherLine', 'InvoiceVoucher', 'InvoiceVoucherLine')
ORDER BY table_name;
