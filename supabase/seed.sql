select setseed(0.42);

insert into customers (name, email, company, created_at)
select
  fn || ' ' || ln,
  case
    when company is null then lower(left(fn, 1) || ln) || i || '@' || mail
    else lower(fn || '.' || ln) || '@' || lower(replace(company, ' ', '')) || '.com'
  end,
  company,
  timestamptz '2024-08-15 09:00+00' + (i::float / 1963) * interval '780 days' + random() * interval '20 hours'
from (
  select
    i,
    (array['Ana','Ben','Chloe','Daniel','Elif','Farid','Grace','Hugo','Ines','Jonas','Kemal','Lena','Marco',
           'Nadia','Oscar','Priya','Quentin','Rosa','Sam','Tara','Umut','Vera','Wes','Yara','Zeynep'])[1 + floor(random() * 25)::int] as fn,
    (array['Silva','Becker','Martin','Kaya','Novak','Rossi','Okafor','Larsen','Dubois','Yilmaz',
           'Schmidt','Moreau','Haddad','Tanaka','Walsh','Costa','Ivanova','Brennan','Demir','Fischer'])[1 + floor(random() * 20)::int] as ln,
    (array['gmail.com','outlook.com','fastmail.com','proton.me','icloud.com'])[1 + floor(random() * 5)::int] as mail,
    case when random() < 0.6 then
      (array['Northwind','Bluebird','Lighthouse','Copper','Atlas','Juniper','Harbor','Summit','Pixel','Orbit','Granite','Maple'])[1 + floor(random() * 12)::int]
      || ' ' ||
      (array['Studio','Labs','Logistics','Coffee','Dental','Partners','Media','Analytics','Foods','Robotics'])[1 + floor(random() * 10)::int]
    end as company
  from generate_series(1, 1963) i
) c;

update customers c
set email = split_part(c.email, '@', 1) || c.id || '@' || split_part(c.email, '@', 2)
from (select id, row_number() over (partition by email order by id) as rn from customers) d
where d.id = c.id and d.rn > 1;

insert into customers (name, email, company, created_at)
select
  name,
  upper(left(email, 1)) || substr(email, 2),
  company,
  least(created_at + interval '3 days' * (1 + id % 40), timestamptz '2026-10-06 12:00+00')
from customers
where id % 53 = 0
order by id;

with ids as (
  select array_agg(id order by id) as a from customers
),
base as (
  select
    g,
    date '2024-09-01' + floor(random() * 765)::int as issued_at,
    random() as r_status,
    random() as r_currency,
    random() as r_terms,
    random() as r_paid,
    a[1 + floor(random() * array_length(a, 1))::int] as customer_id
  from generate_series(1, 10000) g
  cross join ids
),
shaped as (
  select
    *,
    issued_at + case when r_terms < 0.7 then 30 else 14 end as due_date,
    least(issued_at + floor(r_paid * 45)::int, date '2026-10-06') as paid_on,
    case
      when issued_at >= date '2026-09-07' then
        case when r_status < 0.25 then 'draft' when r_status < 0.8 then 'sent' else 'paid' end
      else
        case when r_status < 0.9 then 'paid' when r_status < 0.96 then 'void' else 'sent' end
    end as status
  from base
)
insert into invoices (customer_id, status, currency, issued_at, due_date, paid_at, created_at)
select
  customer_id,
  status,
  case
    when issued_at < date '2024-12-02' then null
    when r_currency < 0.7 then 'USD'
    when r_currency < 0.9 then 'EUR'
    else 'GBP'
  end,
  issued_at,
  due_date,
  case when status = 'paid' and paid_on >= date '2025-03-11' then paid_on + interval '14 hours' end,
  issued_at + interval '9 hours'
from shaped
order by issued_at, g;

with catalog (k, description, lo, hi, max_qty) as (
  values
    (0, 'Consulting (hours)', 120, 180, 40),
    (1, 'Design retainer', 1500, 4000, 1),
    (2, 'API requests (per 1k)', 0.4, 1.2, 500),
    (3, 'Team plan seat', 12, 49, 30),
    (4, 'Onboarding workshop', 800, 2400, 1),
    (5, 'Priority support', 250, 900, 1),
    (6, 'Hosting (monthly)', 40, 600, 3),
    (7, 'Data migration', 600, 3000, 1)
)
insert into line_items (invoice_id, position, description, quantity, unit_price)
select
  i.id,
  p - 1,
  c.description,
  1 + floor(random() * c.max_qty)::int,
  round((c.lo + random() * (c.hi - c.lo))::numeric, 2)
from invoices i
cross join lateral generate_series(1, 1 + (i.id * 7919 % 5)::int) p
join catalog c on c.k = (i.id * 31 + p * 17) % 8
order by i.id, p;

update invoices i
set amount = t.total
from (select invoice_id, sum(quantity * unit_price) as total from line_items group by invoice_id) t
where t.invoice_id = i.id;

delete from line_items
where invoice_id in (
  select id from invoices
  where status = 'paid' and currency is null and id % 11 = 0
  order by id
  limit 20
);

do $$
declare
  customers_total int := (select count(*) from customers);
  invoices_total int := (select count(*) from invoices);
  case_duplicates int := (select count(*) from (select lower(email) from customers group by 1 having count(*) > 1) d);
  exact_duplicates int := (select count(*) from (select email from customers group by 1 having count(*) > 1) d);
  null_currency int := (select count(*) from invoices where currency is null);
  paid_without_items int := (select count(*) from invoices i where status = 'paid' and not exists (select 1 from line_items l where l.invoice_id = i.id));
  overdue_sent int := (select count(*) from invoices where status = 'sent' and due_date < date '2026-10-07');
  paid_late int := (select count(*) from invoices where status = 'paid' and paid_at::date > due_date);
begin
  raise notice 'customers=% invoices=% case_duplicate_emails=% exact_duplicate_emails=% null_currency=% paid_without_line_items=% overdue_sent=% paid_late=%',
    customers_total, invoices_total, case_duplicates, exact_duplicates, null_currency, paid_without_items, overdue_sent, paid_late;
  if customers_total <> 2000 or invoices_total <> 10000 or case_duplicates <> 37 or exact_duplicates <> 0 or paid_without_items <> 20 then
    raise exception 'seed produced unexpected data';
  end if;
end $$;
