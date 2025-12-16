-- Allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks." 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = created_by);
