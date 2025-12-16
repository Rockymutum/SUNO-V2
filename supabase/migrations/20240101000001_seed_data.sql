-- Seed Categories
-- Using DO block to avoid errors if data exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'plumbing') THEN
        insert into public.categories (slug, title, icon_name) values
        ('plumbing', 'Plumbing', 'Wrench'),
        ('electrical', 'Electrical', 'Zap'),
        ('cleaning', 'Cleaning', 'Sparkles'),
        ('moving', 'Moving', 'Truck'),
        ('painting', 'Painting', 'Paintbrush'),
        ('gardening', 'Gardening', 'Flower'),
        ('carpentry', 'Carpentry', 'Hammer'),
        ('tech-support', 'Tech Support', 'Monitor');
    END IF;
END $$;
