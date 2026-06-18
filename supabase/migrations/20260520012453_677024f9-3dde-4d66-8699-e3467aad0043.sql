-- Add reviewer role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';
