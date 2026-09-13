-- Synthetic staging-only records. Never run this seed against production.
insert into public.orders(order_number,buyer_email,currency,subtotal_minor,total_minor,subtotal_inr_minor,total_inr_minor,payment_status,fulfillment_status,customer_city,customer_country_code,created_at)
values
  ('STAGE-1001','customer.one@example.test','INR',1250000,1250000,1250000,1250000,'paid','delivered','Bengaluru','IN',timezone('utc',now())-interval '8 days'),
  ('STAGE-1002','customer.two@example.test','INR',2250000,2250000,2250000,2250000,'pending','in_progress','Chennai','IN',timezone('utc',now())-interval '2 days')
on conflict(order_number) do nothing;

insert into public.inquiries(name,email,company,project_type,message,status,priority)
select 'Synthetic Lead','lead@example.test','Example Test Co','Dashboard','Staging-only inquiry','new','normal'
where not exists(select 1 from public.inquiries where email='lead@example.test');
