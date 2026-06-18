INSERT INTO public.user_roles (user_id, role) VALUES
 ('e07cafd8-5ce4-4e5c-936a-2b63802e1ed1','superadmin'),
 ('e07cafd8-5ce4-4e5c-936a-2b63802e1ed1','admin')
ON CONFLICT DO NOTHING;