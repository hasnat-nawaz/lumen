-- Lumen team accounts.
-- Run AFTER creating the three users in Dashboard -> Authentication -> Users
-- (emails below, password = their PIN, "Auto Confirm User" ticked).

insert into public.members (id, name, role)
select u.id, t.name, t.role
  from auth.users u
  join (
    values
      ('hasnat@lumen.app', 'Hasnat', 'admin'),
      ('fatima@lumen.app', 'Fatima', 'member'),
      ('atta@lumen.app', 'Atta', 'member')
  ) as t (email, name, role) on t.email = u.email
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role;

-- Should list all three people. If someone is missing, their auth user email does not match.
select m.name, m.role, u.email
  from public.members m
  join auth.users u on u.id = m.id
 order by m.role, m.name;
