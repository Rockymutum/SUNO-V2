-- Drop existing constraints
ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_task_id_fkey;

ALTER TABLE public.task_likes
DROP CONSTRAINT IF EXISTS task_likes_task_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE public.applications
ADD CONSTRAINT applications_task_id_fkey
FOREIGN KEY (task_id) REFERENCES public.tasks(id)
ON DELETE CASCADE;

ALTER TABLE public.task_likes
ADD CONSTRAINT task_likes_task_id_fkey
FOREIGN KEY (task_id) REFERENCES public.tasks(id)
ON DELETE CASCADE;
