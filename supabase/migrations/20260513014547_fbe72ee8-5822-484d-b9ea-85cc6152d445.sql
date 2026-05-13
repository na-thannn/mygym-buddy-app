
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.coach_threads REPLICA IDENTITY FULL;
ALTER TABLE public.coach_messages REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='posts';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='post_likes';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='post_comments';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='coach_threads';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_threads; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='coach_messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_messages; END IF;
END $$;
