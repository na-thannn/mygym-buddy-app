
-- Profiles: training level + limitations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS limitations text;

-- Workout logs: workout type + duration
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS workout_type text,
  ADD COLUMN IF NOT EXISTS duration_min integer;

-- Daily nutrition reports (matches agent's ExportNutritionAdvice)
CREATE TABLE IF NOT EXISTS public.nutrition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  day_type text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  breakfast text,
  lunch text,
  dinner text,
  snacks text,
  pre_workout_meal text,
  post_workout_meal text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition owner all" ON public.nutrition_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER nutrition_reports_touch BEFORE UPDATE ON public.nutrition_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_nutrition_reports_user_date ON public.nutrition_reports (user_id, report_date DESC);

-- Weekly progress reports (matches agent's ExportUserProgress)
CREATE TABLE IF NOT EXISTS public.progress_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_sessions integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  total_volume numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress owner all" ON public.progress_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER progress_reports_touch BEFORE UPDATE ON public.progress_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_progress_reports_user_date ON public.progress_reports (user_id, report_date DESC);

-- Workout plan markdown docs (matches SaveWorkoutPlanMD / GetWorkoutPlanMD)
CREATE TABLE IF NOT EXISTS public.workout_plan_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  title text,
  content_md text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_plan_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_docs owner all" ON public.workout_plan_docs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workout_plan_docs_touch BEFORE UPDATE ON public.workout_plan_docs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_plan_docs_user_date ON public.workout_plan_docs (user_id, plan_date DESC);

-- Analyses (matches SaveAnalysisMD: compare plan vs actual)
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  content_md text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses owner all" ON public.analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER analyses_touch BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_analyses_user_date ON public.analyses (user_id, plan_date DESC);
