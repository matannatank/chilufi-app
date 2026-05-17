-- איפוס הצעת הבדיקה + העברת בעלות למתן — כדי לבדוק כפתור "בחר" מהאפליקציה
-- (בלי להתחבר כאריאל)
--
-- אחרי הבדיקה החזר את מתן למפקד משמרת ב':
--   update profiles set role = 'shift_commander', shift = 'b'
--   where id = 'ae6e5442-0bee-4e77-b81e-f295c56acecf';

update swap_offers
set
  poster_id = 'ae6e5442-0bee-4e77-b81e-f295c56acecf',
  status = 'open',
  chosen_applicant_id = null,
  updated_at = now()
where id = '534092f9-e38e-401e-9c8e-750897b9f79b';

update applications
set status = 'pending'
where offer_id = '534092f9-e38e-401e-9c8e-750897b9f79b';

delete from commander_approvals
where offer_id = '534092f9-e38e-401e-9c8e-750897b9f79b';

-- מתן כמציע לוחם משמרת א' (זמני לבדיקה)
update profiles
set role = 'fighter', shift = 'a'
where id = 'ae6e5442-0bee-4e77-b81e-f295c56acecf';

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
where o.id = '534092f9-e38e-401e-9c8e-750897b9f79b';
