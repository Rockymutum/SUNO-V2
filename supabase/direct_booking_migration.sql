-- 1. Add target_worker_id column
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS target_worker_id uuid REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS tasks_target_worker_id_idx ON public.tasks(target_worker_id);

-- 2. Update RLS Policy for Tasks
-- Drop old policy that allowed everyone to see everything
DROP POLICY IF EXISTS "Tasks are viewable by everyone." ON public.tasks;

-- New Policy: Visible if (Public OR Created By User OR Targeted To User)
CREATE POLICY "Tasks visibility policy" ON public.tasks 
FOR SELECT USING (
  (target_worker_id IS NULL) OR 
  (auth.uid() = created_by) OR 
  (auth.uid() = target_worker_id)
);

-- 3. Update Handle Job Acceptance RPC to enforce exclusivity
CREATE OR REPLACE FUNCTION public.handle_job_acceptance(
  task_id uuid,
  worker_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task record;
  v_worker_balance float8;
  v_min_limit float8;
  v_commission float8;
  v_application_id uuid;
  v_creator_contact jsonb;
BEGIN
  -- 1. Fetch Task
  SELECT * INTO v_task FROM public.tasks WHERE id = task_id;
  
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'Task is not open for acceptance.';
  END IF;

  IF v_task.created_by = worker_id THEN
    RAISE EXCEPTION 'You cannot accept your own task.';
  END IF;

  -- CHECK EXCLUSIVITY
  IF v_task.target_worker_id IS NOT NULL AND v_task.target_worker_id != worker_id THEN
     RAISE EXCEPTION 'This task is reserved for another worker.';
  END IF;

  -- 2. Fetch Worker Wallet Info
  SELECT wallet_balance, min_credit_limit 
  INTO v_worker_balance, v_min_limit
  FROM public.users 
  WHERE id = worker_id;

  -- 3. Calculate Commission (10% of min budget)
  v_commission := GREATEST(v_task.budget_min * 0.10, 10.00); 

  -- 4. Check Balance
  IF (v_worker_balance - v_commission) < v_min_limit THEN
    RAISE EXCEPTION 'Insufficient balance. Please recharge your wallet.';
  END IF;

  -- 5. Deduct Commission
  UPDATE public.users
  SET wallet_balance = wallet_balance - v_commission
  WHERE id = worker_id;

  -- 6. Insert Transaction Record
  INSERT INTO public.transactions (user_id, amount, type, description, metadata)
  VALUES (
    worker_id, 
    -v_commission, 
    'DEDUCTION', 
    'Commission for task: ' || v_task.title,
    jsonb_build_object('task_id', task_id)
  );

  -- 7. Update Task Status
  UPDATE public.tasks
  SET status = 'in_progress'
  WHERE id = task_id;

  -- 8. Create or Update Application
  SELECT id INTO v_application_id FROM public.applications 
  WHERE task_id = handle_job_acceptance.task_id AND applications.worker_id = handle_job_acceptance.worker_id;

  IF v_application_id IS NOT NULL THEN
    UPDATE public.applications SET status = 'accepted' WHERE id = v_application_id;
  ELSE
    INSERT INTO public.applications (task_id, worker_id, status, offer_price, message)
    VALUES (task_id, worker_id, 'accepted', v_task.budget_min, 'Instant Accept')
    RETURNING id INTO v_application_id;
  END IF;

  -- Reject other pending applications
  UPDATE public.applications 
  SET status = 'rejected' 
  WHERE task_id = handle_job_acceptance.task_id AND id != v_application_id;

  -- 9. Get Customer Contact info to return
  SELECT jsonb_build_object(
    'phone', phone,
    'location', location
  ) INTO v_creator_contact
  FROM public.users
  WHERE id = v_task.created_by;

  -- 10. Return Data
  RETURN jsonb_build_object(
    'success', true,
    'contact', v_creator_contact
  );

END;
$$;
