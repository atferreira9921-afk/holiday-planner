-- Daily AI usage tracking per user
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage (for future "X/6 used today" UI)
CREATE POLICY "Users can view own AI usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);
