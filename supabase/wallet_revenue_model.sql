-- 1. Update Users Table with Wallet Fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wallet_balance float8 DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS min_credit_limit float8 DEFAULT -200.00,
ADD COLUMN IF NOT EXISTS cancellation_strikes int DEFAULT 0;

-- 2. Create Transactions Table (Safe Enum Creation)
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('DEDUCTION', 'REFUND', 'RECHARGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  amount float8 NOT NULL,
  type transaction_type NOT NULL,
  description text,
  metadata jsonb, -- e.g., { "task_id": "..." }
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Backend Logic: Handle Job Acceptance (RPC)

-- CRITICAL FIX: DROP OLD FUNCTION with old parameter names first
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
  v_commission := GREATEST(v_task.budget_min * 0.10, 10.00); -- Min commission 10rs

  -- 4. Check Balance
  IF (v_worker_balance - v_commission) < v_min_limit THEN
    RAISE EXCEPTION 'Insufficient balance. Please recharge your wallet.';
  END IF;

  -- 5. Deduct Commission
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
  -- Check if application exists
  SELECT id INTO v_application_id FROM public.applications 
  WHERE task_id = p_task_id AND worker_id = p_worker_id;

  IF v_application_id IS NOT NULL THEN
    UPDATE public.applications SET status = 'accepted' WHERE id = v_application_id;
  ELSE
    INSERT INTO public.applications (task_id, worker_id, status, offer_price, message)
    VALUES (p_task_id, p_worker_id, 'accepted', v_task.budget_min, 'Instant Accept')
    RETURNING id INTO v_application_id;
  END IF;

  -- Reject other pending applications (Optional, but good practice)
  UPDATE public.applications 
  SET status = 'rejected' 
  WHERE task_id = p_task_id AND id != v_application_id;

  -- 9. Get Customer Contact info to return
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



-- 4. Backend Logic: Handle Customer Cancellation (Trigger)
CREATE OR REPLACE FUNCTION public.handle_customer_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker_id uuid;
  v_commission float8;
  v_accepted_app record;
BEGIN
  -- Only trigger if status changes to 'cancelled' from 'in_progress'
  IF OLD.status = 'in_progress' AND NEW.status = 'cancelled' THEN
    
    -- Find the worker who had accepted
    SELECT * INTO v_accepted_app 
    FROM public.applications 
    WHERE task_id = OLD.id AND status = 'accepted';

    IF v_accepted_app IS NOT NULL THEN
        -- Calculate Refund (same logic as deduction: 10% of budget)
        v_commission := GREATEST(OLD.budget_min * 0.10, 10.00);

        -- Refund Worker
        UPDATE public.users
        SET wallet_balance = wallet_balance + v_commission
        WHERE id = v_accepted_app.worker_id;

        -- Log Refund Transaction
        INSERT INTO public.transactions (user_id, amount, type, description, metadata)
        VALUES (
          v_accepted_app.worker_id, 
          v_commission, 
          'REFUND', 
          'Refund for cancelled task: ' || OLD.title,
          jsonb_build_object('task_id', OLD.id)
        );

        -- Notification for Worker
        INSERT INTO public.notifications (user_id, title, body, data)
        VALUES (
          v_accepted_app.worker_id,
          'Task Cancelled & Refunded',
          'The customer cancelled the task. Your commission has been refunded.',
          jsonb_build_object('url', '/wallet')
        );
    END IF;

    -- Strike for Customer (Task Creator)
    UPDATE public.users
    SET cancellation_strikes = cancellation_strikes + 1
    WHERE id = OLD.created_by;

  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid duplication errors during re-runs
DROP TRIGGER IF EXISTS on_task_cancelled ON public.tasks;

CREATE TRIGGER on_task_cancelled
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_customer_cancellation();
