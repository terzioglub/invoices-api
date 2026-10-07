alter table invoices add column currency text check (currency in ('USD', 'EUR', 'GBP'));
