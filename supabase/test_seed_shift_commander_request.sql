-- דימוי: משתמש שלח "בקשה להירשם כמפקד משמרת" (בלי טלפון / בלי התחברות אליו)
-- הרץ ב-Supabase SQL Editor (עוקף RLS).
--
-- אחרי הרצה: התחבר כמתן או אברהם → ניהול → בקשות → אשר/דחה.
--
-- UUIDs:
--   גל:     8af65369-4d71-4700-bbf2-d23f89114640
--   מיכאל: 927ddb76-7201-4ddb-8fbe-973c6d22272b
--   מתן (מנהל + מפקד ב'): ae6e5442-0bee-4e77-b81e-f295c56acecf
--   אברהם (מנהל + מפקד א'): 5240359b-0365-41e4-b147-e08dd11dab87
--
-- שנה את v_user_id / v_shift למטה לפי הצורך.

do $$
declare
  v_user_id uuid := '8af65369-4d71-4700-bbf2-d23f89114640'; -- גל
  v_shift text := 'b'; -- משמרת מבוקשת: a | b | c
begin
  if not exists (select 1 from profiles where id = v_user_id) then
    raise exception 'משתמש לא נמצא ב-profiles. עדכן את v_user_id.';
  end if;

  -- ביטול בקשות ממתינות קודמות של אותו משתמש
  delete from shift_commander_requests
  where user_id = v_user_id
    and status = 'pending';

  -- ודא שהוא לא כבר מפקד משמרת (אחרת אין מה לאשר בפרופיל)
  update profiles
  set role = 'fighter',
      updated_at = now()
  where id = v_user_id
    and role = 'shift_commander';

  insert into shift_commander_requests (user_id, shift, status)
  values (v_user_id, v_shift, 'pending');

  raise notice 'נוצרה בקשה ממתינה: user=% shift=%', v_user_id, v_shift;
end $$;

-- אימות:
select
  r.id,
  r.status,
  r.shift,
  p.full_name,
  p.role,
  p.shift as profile_shift,
  r.created_at
from shift_commander_requests r
join profiles p on p.id = r.user_id
where r.user_id = '8af65369-4d71-4700-bbf2-d23f89114640'
order by r.created_at desc
limit 3;
