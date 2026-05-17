-- Seed בדיקה: הצעה של אריאל (משמרת א') + מועמדות של גל (משמרת ב')
-- הרץ ב-Supabase SQL Editor (עוקף RLS — כמו "לחיצות" ב-DB בלבד).
--
-- UUIDs מהמערכת שלך:
--   אריאל: 67ac3b84-ec5b-499d-9eec-fed65be9d5c7
--   גל:    8af65369-4d71-4700-bbf2-d23f89114640
--   אברהם (מפקד א'): 5240359b-0365-41e4-b147-e08dd11dab87
--   מתן (מפקד ב'):   ae6e5442-0bee-4e77-b81e-f295c56acecf

-- ========== חלק א': הצעה פתוחה + מועמדות ממתינה ==========
-- אחרי הרצה: התחבר כאריאל (אם יש) או ראה את ההצעה בבית; המציע יכול ללחוץ "בחר" באפליקציה.

with new_offer as (
  insert into swap_offers (
    poster_id,
    shift_date,
    start_time,
    end_time,
    location,
    notes,
    status,
    target_shift
  )
  values (
    '67ac3b84-ec5b-499d-9eec-fed65be9d5c7',
    current_date + 7,
    '07:00',
    '07:00',
    'petah_tikva',
    'בדיקה אוטומטית — אריאל מפרסם, גל מועמד',
    'open',
    'b'
  )
  returning id
)
insert into applications (offer_id, applicant_id, status)
select id, '8af65369-4d71-4700-bbf2-d23f89114640', 'pending'
from new_offer;

-- הצג את ההצעה שנוצרה
select
  o.id as offer_id,
  o.status,
  p_poster.full_name as poster,
  p_applicant.full_name as applicant,
  a.status as application_status
from swap_offers o
join profiles p_poster on p_poster.id = o.poster_id
join applications a on a.offer_id = o.id
join profiles p_applicant on p_applicant.id = a.applicant_id
where o.notes like 'בדיקה אוטומטית%'
order by o.created_at desc
limit 1;
