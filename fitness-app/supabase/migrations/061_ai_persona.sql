-- 061 — Engagement (6.9) : chacun choisit l'avatar (collection « Forge »,
-- public/avatars) et le ton de son assistant IA. La fonction ai-coach lit le
-- ton pour adapter sa façon de parler ; le contenu des conseils ne change pas.

alter table public.profiles
  add column ai_avatar text not null default 'forge'
    check (ai_avatar in ('forge', 'titan', 'zen', 'sergent', 'eclair', 'robot', 'kettlebell', 'flamme')),
  add column ai_tone text not null default 'motivating'
    check (ai_tone in ('motivating', 'calm', 'military', 'funny'));
