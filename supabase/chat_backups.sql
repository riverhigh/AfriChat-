-- ============================================================
-- AGC Persistent Per-User Chat & Message Backup Table
-- Run in Supabase Dashboard -> SQL Editor if desired
-- (App also includes automatic fallback via scam_reports __agc_sys_chats_*)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agc_chat_backups (
  phone_digits  TEXT PRIMARY KEY,
  full_phone    TEXT NOT NULL DEFAULT '',
  chats_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  messages_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agc_chat_backups DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.agc_chat_backups TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agc_chat_backups TO authenticated;
