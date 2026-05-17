-- איפוס בדיקות בקשת מפקד משמרת (לפני הרצה חוזרת של test_seed_shift_commander_request.sql)
-- הרץ ב-Supabase SQL Editor.

do $$
declare
  v_user_id uuid := '8af65369-4d71-4700-bbf2-d23f89114640'; -- גל — שנה לפי הצורך
begin
  delete from shift_commander_requests
  where user_id = v_user_id;

  -- אופציונלי: החזר ללוחם אם אישרת בטעות בבדיקה
  -- update profiles set role = 'fighter', updated_at = now() where id = v_user_id and role = 'shift_commander';

  raise notice 'נמחקו בקשות מפקד משמרת עבור %', v_user_id;
end $$;
