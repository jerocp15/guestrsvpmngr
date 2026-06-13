-- Clear previously shared (ownerless) data
DELETE FROM public.reservations;
DELETE FROM public.restaurant_tables;
DELETE FROM public.staff;

-- Add owner column to each table
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();

-- Replace shared policies with per-user policies: reservations
DROP POLICY IF EXISTS "Authenticated users can manage reservations" ON public.reservations;
CREATE POLICY "Users manage their own reservations"
ON public.reservations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- restaurant_tables
DROP POLICY IF EXISTS "Authenticated users can manage tables" ON public.restaurant_tables;
CREATE POLICY "Users manage their own tables"
ON public.restaurant_tables FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- staff
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON public.staff;
CREATE POLICY "Users manage their own staff"
ON public.staff FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);