-- ============ Learning Library ============

CREATE TABLE public.learning_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  role_tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  level TEXT NOT NULL DEFAULT 'beginner',
  estimated_minutes INT NOT NULL DEFAULT 30,
  cover_emoji TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  passing_score INT NOT NULL DEFAULT 80,
  published BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_courses TO authenticated;
GRANT ALL ON public.learning_courses TO service_role;
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.learning_courses FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins manage courses"
  ON public.learning_courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_learning_courses_updated
  BEFORE UPDATE ON public.learning_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.learning_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  est_minutes INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX idx_learning_lessons_course ON public.learning_lessons(course_id, sort_order);
GRANT SELECT ON public.learning_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_lessons TO authenticated;
GRANT ALL ON public.learning_lessons TO service_role;
ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons of published courses"
  ON public.learning_lessons FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.learning_courses c WHERE c.id = course_id AND c.published = true)
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  );
CREATE POLICY "Admins manage lessons"
  ON public.learning_lessons FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_learning_lessons_updated
  BEFORE UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.learning_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_quizzes_lesson ON public.learning_quizzes(lesson_id, sort_order);
CREATE INDEX idx_learning_quizzes_course ON public.learning_quizzes(course_id);
GRANT SELECT ON public.learning_quizzes TO authenticated;
GRANT ALL ON public.learning_quizzes TO service_role;
ALTER TABLE public.learning_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read quiz questions"
  ON public.learning_quizzes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.learning_courses c WHERE c.id = course_id AND c.published = true)
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  );
CREATE POLICY "Admins manage quizzes"
  ON public.learning_quizzes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));


CREATE TABLE public.learning_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_score INT,
  best_score INT,
  attempts INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_learning_enrollments_user ON public.learning_enrollments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_enrollments TO authenticated;
GRANT ALL ON public.learning_enrollments TO service_role;
ALTER TABLE public.learning_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their enrollments"
  ON public.learning_enrollments FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users create their enrollments"
  ON public.learning_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their enrollments"
  ON public.learning_enrollments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete their enrollments"
  ON public.learning_enrollments FOR DELETE
  USING (auth.uid() = user_id);


CREATE TABLE public.learning_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_learning_lesson_progress_user ON public.learning_lesson_progress(user_id, course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_lesson_progress TO authenticated;
GRANT ALL ON public.learning_lesson_progress TO service_role;
ALTER TABLE public.learning_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their progress"
  ON public.learning_lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users insert their progress"
  ON public.learning_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their progress"
  ON public.learning_lesson_progress FOR DELETE
  USING (auth.uid() = user_id);


CREATE TABLE public.learning_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  certificate_no TEXT NOT NULL UNIQUE,
  score INT NOT NULL,
  learner_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  storage_path TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_certificates_user ON public.learning_certificates(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_certificates TO authenticated;
GRANT ALL ON public.learning_certificates TO service_role;
ALTER TABLE public.learning_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their certificates"
  ON public.learning_certificates FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users insert their certificates"
  ON public.learning_certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);
