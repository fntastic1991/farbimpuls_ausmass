-- Add scope column to projects and category_settings
alter table public.projects
  add column if not exists scope text check (scope in ('innen','aussen')) not null default 'innen';

alter table public.category_settings
  add column if not exists scope text check (scope in ('innen','aussen')) not null default 'innen';

-- Helpful index
create index if not exists category_settings_scope_active_idx
  on public.category_settings (scope, is_active, category);

-- Seed sensible Defaults nur wenn noch keine entsprechenden Kategorien existieren
insert into public.category_settings (category, offer_title, offer_description, tax_rate, unit_price, is_active, scope)
select v.category, v.offer_title, v.offer_description, v.tax_rate, v.unit_price, true, v.scope
from (
  values
    -- Innenarbeiten
    ('decken', 'Malerarbeiten: Decke', 'Streichen der Deckenflächen mit hochwertigen Innenfarben. Der Anstrich erfolgt deckend und gleichmäßig.', 8.1, 8.90, 'innen'),
    ('waende', 'Malerarbeiten: Wände', 'Streichen der Wandflächen mit emissionsarmen Innenfarben. Saubere Abdeckung und Kantenführung.', 8.1, 7.50, 'innen'),
    ('sockelleisten', 'Montage: Sockelleisten', 'Liefern und Montieren von Sockelleisten, inkl. Zuschnitt und Fixierung.', 8.1, 4.50, 'innen'),

    -- Aussenarbeiten
    ('fassade', 'Malerarbeiten: Fassade', 'Reinigen, Grundieren und Deckanstrich der Fassadenflächen mit wetterbeständiger Fassadenfarbe.', 8.1, 12.90, 'aussen'),
    ('balkongelaender', 'Anstrich: Balkongeländer', 'Entrosten, Grundieren und Lackieren von Metallgeländern mit Korrosionsschutzlack.', 8.1, 14.50, 'aussen'),
    ('sockel', 'Beschichtung: Sockelbereich', 'Beschichten des Sockelbereichs mit strapazierfähiger, wasserabweisender Beschichtung.', 8.1, 11.00, 'aussen')
) as v(category, offer_title, offer_description, tax_rate, unit_price, scope)
where not exists (
  select 1 from public.category_settings c where c.category = v.category and c.scope = v.scope
);

