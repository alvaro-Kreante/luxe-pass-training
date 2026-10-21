-- Solo local: corre tras las migraciones en `supabase db reset` ([db.seed]
-- en config.toml). `db push` no lo aplica, así que nunca llega a
-- luxepass-dev/luxepass-prod. Idempotente: se puede volver a correr con psql.

-- Cuenta admin de desarrollo (/admin/login). Su dominio no es de test, así
-- que `cleanTestData` no la borra.
do $seed$
declare
  v_email constant text := 'alvaro+admin@kreante.co';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt('Pa$$w0rd!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{}',
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  insert into public.user_roles (user_id, role)
  select v_user_id, 'admin'
  where not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'admin'
  );
end
$seed$;
