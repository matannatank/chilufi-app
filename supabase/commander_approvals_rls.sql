-- Run in Supabase SQL Editor if choose-applicant fails with generic error.
-- Allows posters to create/clear approval rows and commanders to clean up on reject.

create policy "Posters can insert commander approvals for own offers"
on commander_approvals for insert
with check (
  auth.uid() = (select poster_id from swap_offers where id = offer_id)
);

create policy "Posters can delete commander approvals for own offers"
on commander_approvals for delete
using (
  auth.uid() = (select poster_id from swap_offers where id = offer_id)
);

create policy "Commanders can delete approvals on offers they command"
on commander_approvals for delete
using (
  exists (
    select 1
    from commander_approvals as commander_offer_approvals
    where commander_offer_approvals.offer_id = commander_approvals.offer_id
      and commander_offer_approvals.commander_id = auth.uid()
  )
);
