-- =============================================================================
-- ניקוי מערכת אחרי בדיקות
-- הרץ ב-Supabase SQL Editor (דורש הרשאות postgres / service).
--
-- מה הסקריפט עושה:
--   1. מוחק את כל הצעות החילוף + מועמדויות + אישורי מפקדים (cascade)
--   2. מוחק את כל בקשות "מפקד משמרת"
--   3. מוחק משתמשים לפי שם (ברירת מחדל: גל רגב, נועה הלפרן)
--
-- לא נוגע ב: מתן, אברהם, שאר משתמשים, טבלת app_admins
-- =============================================================================

-- שמות למחיקה — ערוך כאן אם צריך
-- התאמה: שם מדויק (אחרי trim) או שם שמתחיל בערך הזה
do $$
declare
  v_names_to_delete text[] := array['גל רגב', 'נועה הלפרן'];
  v_protected_ids uuid[] := array[
    'ae6e5442-0bee-4e77-b81e-f295c56acecf'::uuid, -- מתן
    '5240359b-0365-41e4-b147-e08dd11dab87'::uuid  -- אברהם
  ];
  v_user_ids uuid[];
  v_offers_count int;
  v_requests_count int;
  r record;
begin
  -- ---------------------------------------------------------------------------
  -- שלב 0: תצוגה מקדימה (רק הודעות — לא מוחק עדיין)
  -- ---------------------------------------------------------------------------
  select count(*) into v_offers_count from swap_offers;
  select count(*) into v_requests_count from shift_commander_requests;

  raise notice '=== תצוגה מקדימה ===';
  raise notice 'הצעות חילוף למחיקה: %', v_offers_count;
  raise notice 'בקשות מפקד משמרת למחיקה: %', v_requests_count;

  select array_agg(p.id order by p.full_name)
  into v_user_ids
  from profiles p
  where p.id <> all (v_protected_ids)
    and trim(p.full_name) = any (
      select trim(n.name) from unnest(v_names_to_delete) as n(name)
    );

  if v_user_ids is null or cardinality(v_user_ids) = 0 then
    raise notice 'לא נמצאו פרופילים למחיקה לשמות: %', v_names_to_delete;
  else
    raise notice 'משתמשים למחיקה (%):', cardinality(v_user_ids);
    for r in
      select p.id, p.full_name, p.phone, p.role
      from profiles p
      where p.id = any (v_user_ids)
    loop
      raise notice '  - % | % | % | %', r.full_name, r.id, r.phone, r.role;
    end loop;
  end if;

  -- ---------------------------------------------------------------------------
  -- שלב 1: כל נתוני החילופים
  -- ---------------------------------------------------------------------------
  delete from swap_offers;
  raise notice 'נמחקו כל ההצעות (applications + commander_approvals ב-cascade)';

  -- ---------------------------------------------------------------------------
  -- שלב 2: כל בקשות מפקד משמרת
  -- ---------------------------------------------------------------------------
  delete from shift_commander_requests;
  raise notice 'נמחקו כל בקשות מפקד משמרת';

  -- ---------------------------------------------------------------------------
  -- שלב 3: משתמשים לפי שם (auth + profile ב-cascade)
  -- ---------------------------------------------------------------------------
  if v_user_ids is not null and cardinality(v_user_ids) > 0 then
    delete from auth.users
    where id = any (v_user_ids);
    raise notice 'נמחקו % משתמשים מ-auth (כולל profiles, push וכו'')', cardinality(v_user_ids);
  end if;

  -- ---------------------------------------------------------------------------
  -- שלב 4 (אופציונלי): החזרת מפקדי משמרת אחרי בדיקות ששינו תפקיד זמנית
  -- ---------------------------------------------------------------------------
  update profiles
  set role = 'shift_commander', shift = 'b', updated_at = now()
  where id = 'ae6e5442-0bee-4e77-b81e-f295c56acecf'
    and role <> 'shift_commander';

  update profiles
  set role = 'shift_commander', shift = 'a', updated_at = now()
  where id = '5240359b-0365-41e4-b147-e08dd11dab87'
    and role <> 'shift_commander';

  raise notice '=== ניקוי הושלם ===';
end $$;

-- ---------------------------------------------------------------------------
-- אימות אחרי הרצה
-- ---------------------------------------------------------------------------
select 'swap_offers' as table_name, count(*) as remaining from swap_offers
union all
select 'applications', count(*) from applications
union all
select 'commander_approvals', count(*) from commander_approvals
union all
select 'shift_commander_requests', count(*) from shift_commander_requests;

select id, full_name, phone, role, shift
from profiles
order by full_name;
