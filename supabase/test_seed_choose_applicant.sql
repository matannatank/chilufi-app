-- דימוי "בחר מועמד" עד pending_approval + שורות אישור מפקדים
-- הרץ רק אחרי test_seed_ariel_gal.sql (או החלף OFFER_ID ידנית).
--
-- שים לב: זה לא בודק את כפתור "בחר" באפליקציה (RLS מהדפדפן).
-- מתאים לבדיקת אישור מפקדים (אברהם + מתן) בלי להתחבר כאריאל/גל.

-- אם יש כבר הצעת בדיקה פתוחה — קח את ה-id האחרון:
-- select id from swap_offers where notes like 'בדיקה אוטומטית%' and status = 'open' order by created_at desc limit 1;

do $$
declare
  v_offer_id uuid;
  v_application_id uuid;
  v_applicant_id uuid := '8af65369-4d71-4700-bbf2-d23f89114640';
  v_commander_a uuid := '5240359b-0365-41e4-b147-e08dd11dab87';
  v_commander_b uuid := 'ae6e5442-0bee-4e77-b81e-f295c56acecf';
begin
  select o.id, a.id
  into v_offer_id, v_application_id
  from swap_offers o
  join applications a on a.offer_id = o.id and a.applicant_id = v_applicant_id
  where o.notes like 'בדיקה אוטומטית%'
    and o.status = 'open'
  order by o.created_at desc
  limit 1;

  if v_offer_id is null then
    raise exception 'לא נמצאה הצעת בדיקה פתוחה. הרץ קודם את test_seed_ariel_gal.sql';
  end if;

  update swap_offers
  set status = 'pending_approval',
      chosen_applicant_id = v_applicant_id,
      updated_at = now()
  where id = v_offer_id;

  update applications
  set status = 'chosen'
  where id = v_application_id;

  delete from commander_approvals where offer_id = v_offer_id;

  insert into commander_approvals (offer_id, commander_id, shift, status)
  values
    (v_offer_id, v_commander_a, 'a', 'pending'),
    (v_offer_id, v_commander_b, 'b', 'pending');

  raise notice 'offer_id = %', v_offer_id;
end $$;

select
  o.id as offer_id,
  o.status,
  ca.shift,
  p.full_name as commander,
  ca.status as approval_status
from swap_offers o
join commander_approvals ca on ca.offer_id = o.id
join profiles p on p.id = ca.commander_id
where o.notes like 'בדיקה אוטומטית%'
order by o.created_at desc, ca.shift
limit 10;
