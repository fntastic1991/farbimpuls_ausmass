-- Seed default categories if not exists
insert into public.category_settings (category, offer_title, offer_description, tax_rate, unit_price, is_active)
select v.category, v.offer_title, v.offer_description, v.tax_rate, v.unit_price, true
from (
  values
    ('Wandflächen', 'Wandflächen', null, 8.1, 0),
    ('Deckenflächen', 'Deckenflächen', null, 8.1, 0),
    ('Sockelleisten', 'Sockelleisten', null, 8.1, 0),
    ('Türen', 'Türen', null, 8.1, 0),
    ('Fenster', 'Fenster', null, 8.1, 0)
) as v(category, offer_title, offer_description, tax_rate, unit_price)
where not exists (
  select 1 from public.category_settings c where c.category = v.category
);
