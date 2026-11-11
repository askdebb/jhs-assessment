-- Strip legacy base64 media from past chat messages to stop bandwidth drain
UPDATE public.chat_messages 
SET media_url = NULL 
WHERE media_url LIKE 'data:%';
-- 