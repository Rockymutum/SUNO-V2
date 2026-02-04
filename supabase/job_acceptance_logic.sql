-- Backend Logic: Handle Job Acceptance (RPC)
-- Run this script SEPARATELY.

DROP FUNCTION IF EXISTS public.handle_job_acceptance(uuid, uuid);

CREATE OR REPLACE FUNCTION public.handle_job_acceptance(
  p_task_id uuid,
  p_worker_id uuid
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
  v_worker_name text;
BEGIN
  -- 1. Fetch Task
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'Task is not open for acceptance.';
  END IF;

  IF v_task.created_by = p_worker_id THEN
    RAISE EXCEPTION 'You cannot accept your own task.';
  END IF;

  -- 2. Fetch Worker Wallet Info
  SELECT wallet_balance, min_credit_limit, display_name
  INTO v_worker_balance, v_min_limit, v_worker_name
  FROM public.users 
  WHERE id = p_worker_id;

  -- 3. Calculate Commission (10% of min budget)
  v_commission := GREATEST(v_task.budget_min * 0.10, 10.00); 

  -- 4. Check Balance
  IF (v_worker_balance - v_commission) < v_min_limit THEN
    RAISE EXCEPTION 'Insufficient balance. Please recharge your wallet.';
  END IF;

  -- 5. Deduct Commission from Worker
  UPDATE public.users
  SET wallet_balance = wallet_balance - v_commission
  WHERE id = p_worker_id;

  -- 6. Insert Transaction Record
  INSERT INTO public.transactions (user_id, amount, type, description, metadata)
  VALUES (
    p_worker_id, 
    -v_commission, 
    'DEDUCTION', 
    'Commission for task: ' || v_task.title,
    jsonb_build_object('task_id', p_task_id)
  );

  -- 7. Update Task Status
  UPDATE public.tasks
  SET status = 'in_progress'
  WHERE id = p_task_id;

  -- 8. Create or Update Application
  SELECT id INTO v_application_id FROM public.applications 
  WHERE task_id = p_task_id AND worker_id = p_worker_id;

  IF v_application_id IS NOT NULL THEN
    UPDATE public.applications SET status = 'accepted' WHERE id = v_application_id;
  ELSE
    INSERT INTO public.applications (task_id, worker_id, status, offer_price, message)
    VALUES (p_task_id, p_worker_id, 'accepted', v_task.budget_min, 'Instant Accept')
    RETURNING id INTO v_application_id;
  END IF;

  -- Reject other pending applications
  UPDATE public.applications 
  SET status = 'rejected' 
  WHERE task_id = p_task_id AND id != v_application_id;

  -- 9. Get Customer Contact info to return to Worker
  SELECT jsonb_build_object(
    'phone', phone,
    'location', location
  ) INTO v_creator_contact
  FROM public.users
  WHERE id = v_task.created_by;

  -- 10. NOTIFY CUSTOMER (Task Creator)
  INSERT INTO public.notifications (user_id, title, body, data, is_read)
  VALUES (
    v_task.created_by,
    'Booking Accepted! ✅',
    v_worker_name || ' has accepted your booking and will contact you shortly.',
    jsonb_build_object('url', '/task/' || p_task_id),
    false
  );

  -- 11. Return Data
  RETURN jsonb_build_object(
    'success', true,
    'contact', v_creator_contact
  );

END;
$$;
