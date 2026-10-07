create table customers (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  company text,
  created_at timestamptz not null default now()
);

create sequence invoice_number_seq;

create table invoices (
  id bigint generated always as identity primary key,
  number text not null unique default 'INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0'),
  customer_id bigint not null references customers (id),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  amount numeric(12, 2) not null default 0,
  issued_at date not null default current_date,
  due_date date not null,
  created_at timestamptz not null default now()
);

create index invoices_customer_id_idx on invoices (customer_id);
create index invoices_status_due_date_idx on invoices (status, due_date);

create table line_items (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

create index line_items_invoice_id_idx on line_items (invoice_id);

alter table customers enable row level security;
alter table invoices enable row level security;
alter table line_items enable row level security;
