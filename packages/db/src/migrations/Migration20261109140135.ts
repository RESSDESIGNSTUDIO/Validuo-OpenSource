import { Migration } from '@mikro-orm/migrations';

/**
 * Aligns the schema with the revised accounts spec: permissions cover the whole account in v1
 * (no scope columns, no granted-by), a user has exactly one account, and rate-limit counters are
 * keyed by (e-mail, IP). Written by hand because the generator would also drop the foreign keys
 * and CHECKs that the ORM does not model.
 */
export class Migration20261109140135 extends Migration {

  override name = 'Migration20261109140135';

  override up(): void | Promise<void> {
    this.addSql(`alter table "permissions" drop constraint "permissions_granted_by_account_foreign";`);
    this.addSql(`alter table "permissions" drop constraint "permissions_scope_check";`);
    this.addSql(`alter table "permissions" drop constraint "permissions_person_scope_action_unique";`);
    this.addSql(`alter table "permissions" drop column "granted_by_person_id", drop column "scope_id", drop column "scope_type";`);
    this.addSql(`alter table "permissions" add constraint "permissions_person_action_unique" unique ("person_id", "action");`);

    this.addSql(`alter table "persons" drop constraint "persons_account_id_user_id_unique";`);
    this.addSql(`drop index "persons_user_id_index";`);
    this.addSql(`alter table "persons" add constraint "persons_user_id_unique" unique ("user_id");`);

    // Counters are ephemeral; the old keys (by e-mail alone) are meaningless under the new ones.
    this.addSql(`delete from "login_attempts";`);
    this.addSql(`alter table "login_attempts" drop constraint "login_attempts_kind_check";`);
    this.addSql(`alter table "login_attempts" add constraint "login_attempts_kind_check" check ("kind" in ('email_ip', 'ip', 'register_ip'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`delete from "login_attempts";`);
    this.addSql(`alter table "login_attempts" drop constraint "login_attempts_kind_check";`);
    this.addSql(`alter table "login_attempts" add constraint "login_attempts_kind_check" check ("kind" in ('login_email', 'login_ip', 'register_ip'));`);

    this.addSql(`alter table "persons" drop constraint "persons_user_id_unique";`);
    this.addSql(`create index "persons_user_id_index" on "persons" ("user_id");`);
    this.addSql(`alter table "persons" add constraint "persons_account_id_user_id_unique" unique ("account_id", "user_id");`);

    this.addSql(`alter table "permissions" drop constraint "permissions_person_action_unique";`);
    this.addSql(`alter table "permissions" add column "scope_type" varchar(16) not null default 'account', add column "scope_id" uuid, add column "granted_by_person_id" uuid;`);
    this.addSql(`update "permissions" set "scope_id" = "account_id", "granted_by_person_id" = "person_id";`);
    this.addSql(`alter table "permissions" alter column "scope_type" drop default, alter column "scope_id" set not null, alter column "granted_by_person_id" set not null;`);
    this.addSql(`alter table "permissions" add constraint "permissions_person_scope_action_unique" unique ("person_id", "scope_type", "scope_id", "action");`);
    this.addSql(`alter table "permissions" add constraint "permissions_scope_check" check ("scope_type" = 'account' and "scope_id" = "account_id");`);
    this.addSql(`alter table "permissions" add constraint "permissions_granted_by_account_foreign" foreign key ("granted_by_person_id", "account_id") references "persons" ("id", "account_id");`);
  }

}
