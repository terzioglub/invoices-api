update invoices i
set amount_cents = coalesce((
  select sum(round(l.quantity * l.unit_price * 100))
  from line_items l
  where l.invoice_id = i.id
), 0)
where i.amount_cents is null;

alter table invoices alter column amount_cents set not null;
