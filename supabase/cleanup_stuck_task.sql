
CREATE OR REPLACE FUNCTION public.cleanup_stuck_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Mark Task as Completed
  UPDATE public.tasks
  SET status = 'completed'
  WHERE id = p_task_id;

  -- 2. Mark Application as Completed (if not already)
  UPDATE public.applications
  SET status = 'accepted' -- Ensure it is accepted first? No, it should be accepted.
  WHERE task_id = p_task_id AND status = 'accepted';
  
  -- Note: We assume the worker calls this on their own accepted task.
END;
$$;
