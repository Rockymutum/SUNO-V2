-- Seed Categories
insert into public.categories (slug, title, icon_name) values
('plumbing', 'Plumbing', 'Wrench'),
('electrical', 'Electrical', 'Zap'),
('cleaning', 'Cleaning', 'Sparkles'),
('moving', 'Moving', 'Truck'),
('painting', 'Painting', 'Paintbrush'),
('gardening', 'Gardening', 'Flower'),
('carpentry', 'Carpentry', 'Hammer'),
('tech-support', 'Tech Support', 'Monitor');

-- Note: Actual user/task data is best created via the App UI or using the Supabase studio to simulate real Auth IDs.
