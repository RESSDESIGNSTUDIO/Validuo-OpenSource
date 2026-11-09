import { Migration } from '@mikro-orm/migrations';

export class Migration20261109132007 extends Migration {

  override name = 'Migration20261109132007';

  override up(): void | Promise<void> {
    this.addSql(`create table "accounts" ("id" uuid not null default gen_random_uuid(), "name" varchar(120) not null, "created_at" timestamptz not null default now(), primary key ("id"));`);

    this.addSql(`create table "login_attempts" ("kind" varchar(16) not null, "key_hash" varchar(64) not null, "window_start" timestamptz not null, "count" int not null default 0, primary key ("kind", "key_hash", "window_start"));`);

    this.addSql(`create table "permissions" ("id" uuid not null default gen_random_uuid(), "account_id" uuid not null, "person_id" uuid not null, "scope_type" varchar(16) not null, "scope_id" uuid not null, "action" varchar(32) not null, "granted_by_person_id" uuid not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "permissions" add constraint "permissions_person_scope_action_unique" unique ("person_id", "scope_type", "scope_id", "action");`);

    this.addSql(`create table "persons" ("id" uuid not null default gen_random_uuid(), "account_id" uuid not null, "user_id" uuid not null, "display_name" varchar(120) not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "persons" add constraint "persons_id_account_id_unique" unique ("id", "account_id");`);
    this.addSql(`alter table "persons" add constraint "persons_account_id_user_id_unique" unique ("account_id", "user_id");`);

    this.addSql(`create table "sessions" ("id" uuid not null default gen_random_uuid(), "person_id" uuid not null, "account_id" uuid not null, "token_hash" varchar(64) not null, "created_at" timestamptz not null default now(), "last_seen_at" timestamptz not null default now(), "expires_at" timestamptz not null, "revoked_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "sessions" add constraint "sessions_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "sessions_expires_at_index" on "sessions" ("expires_at");`);

    this.addSql(`create table "users" ("id" uuid not null default gen_random_uuid(), "email" varchar(254) not null, "password_hash" text not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);

    // Constraints the ORM does not generate: tenant integrity is enforced by the database, not only
    // by the repositories. Composite keys `(person_id, account_id)` make it impossible to relate a
    // session or a permission to a person of another account.
    this.addSql(`alter table "persons" add constraint "persons_account_id_foreign" foreign key ("account_id") references "accounts" ("id");`);
    this.addSql(`alter table "persons" add constraint "persons_user_id_foreign" foreign key ("user_id") references "users" ("id");`);
    this.addSql(`alter table "sessions" add constraint "sessions_person_account_foreign" foreign key ("person_id", "account_id") references "persons" ("id", "account_id");`);
    this.addSql(`alter table "permissions" add constraint "permissions_person_account_foreign" foreign key ("person_id", "account_id") references "persons" ("id", "account_id");`);
    this.addSql(`alter table "permissions" add constraint "permissions_granted_by_account_foreign" foreign key ("granted_by_person_id", "account_id") references "persons" ("id", "account_id");`);
    // v1 knows only the account scope; the group scope arrives with the groups table (E02).
    this.addSql(`alter table "permissions" add constraint "permissions_scope_check" check ("scope_type" = 'account' and "scope_id" = "account_id");`);
    this.addSql(`alter table "permissions" add constraint "permissions_action_check" check ("action" in ('read', 'write', 'manage_permissions'));`);
    this.addSql(`alter table "users" add constraint "users_email_lowercase_check" check ("email" = lower("email"));`);
    this.addSql(`alter table "login_attempts" add constraint "login_attempts_kind_check" check ("kind" in ('login_email', 'login_ip', 'register_ip'));`);
    this.addSql(`alter table "login_attempts" add constraint "login_attempts_count_check" check ("count" >= 0);`);
    this.addSql(`create index "persons_user_id_index" on "persons" ("user_id");`);
    this.addSql(`create index "sessions_person_id_index" on "sessions" ("person_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "accounts" cascade;`);
    this.addSql(`drop table if exists "login_attempts" cascade;`);
    this.addSql(`drop table if exists "permissions" cascade;`);
    this.addSql(`drop table if exists "persons" cascade;`);
    this.addSql(`drop table if exists "sessions" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
  }

}
