-- Backend Logic: Handle Customer Cancellation (Trigger)
-- Run this script SEPARATELY.

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
        -- Calculate Refund
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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_task_cancelled ON public.tasks;

CREATE TRIGGER on_task_cancelled
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_customer_cancellation();
