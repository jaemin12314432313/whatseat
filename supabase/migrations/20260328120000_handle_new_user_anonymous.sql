-- 익명·OAuth 등 이메일이 없을 때 profiles.display_name 이 비지 않도록

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      '게스트'
    )
  );
  return new;
end;
$$;
