-- מפקד זמני למשמרת ב' (מיכאל) — כי מתן הוא fighter לצורך בדיקת "בחר"
-- אברהם נשאר מפקד משמרת א'

update profiles
set role = 'shift_commander', shift = 'b'
where id = '927ddb76-7201-4ddb-8fbe-973c6d22272b'; -- מיכאל בוטובסקי

update profiles
set role = 'fighter', shift = 'a'
where id = 'ae6e5442-0bee-4e77-b81e-f295c56acecf'; -- מתן — מציע לבדיקה

update profiles
set role = 'fighter', shift = 'b'
where id = '8af65369-4d71-4700-bbf2-d23f89114640'; -- גל — מועמד

-- וידוא שההצעה עדיין פתוחה לבחירה
update swap_offers
set status = 'open', chosen_applicant_id = null
where id = '534092f9-e38e-401e-9c8e-750897b9f79b';

update applications
set status = 'pending'
where offer_id = '534092f9-e38e-401e-9c8e-750897b9f79b';

delete from commander_approvals
where offer_id = '534092f9-e38e-401e-9c8e-750897b9f79b';

select full_name, role, shift from profiles
where id in (
  '5240359b-0365-41e4-b147-e08dd11dab87',
  '927ddb76-7201-4ddb-8fbe-973c6d22272b',
  'ae6e5442-0bee-4e77-b81e-f295c56acecf',
  '8af65369-4d71-4700-bbf2-d23f89114640'
)
order by shift, full_name;
