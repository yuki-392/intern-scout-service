# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_03_090100) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "applications", force: :cascade do |t|
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.bigint "intern_user_id", null: false
    t.bigint "job_posting_id", null: false
    t.bigint "message_id", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_applications_on_conversation_id"
    t.index ["intern_user_id"], name: "index_applications_on_intern_user_id"
    t.index ["job_posting_id", "intern_user_id"], name: "index_applications_on_job_posting_id_and_intern_user_id", unique: true
    t.index ["job_posting_id"], name: "index_applications_on_job_posting_id"
    t.index ["message_id"], name: "index_applications_on_message_id"
  end

  create_table "companies", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_companies_on_user_id", unique: true
  end

  create_table "conversations", force: :cascade do |t|
    t.bigint "company_user_id", null: false
    t.datetime "created_at", null: false
    t.bigint "intern_user_id", null: false
    t.datetime "last_messaged_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_user_id", "intern_user_id"], name: "index_conversations_on_company_user_id_and_intern_user_id", unique: true
    t.index ["company_user_id"], name: "index_conversations_on_company_user_id"
    t.index ["intern_user_id"], name: "index_conversations_on_intern_user_id"
    t.index ["last_messaged_at", "id"], name: "index_conversations_on_last_messaged_at_and_id", order: :desc
    t.check_constraint "company_user_id <> intern_user_id", name: "conversation_participants_differ"
  end

  create_table "intern_profile_technical_stacks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "intern_profile_id", null: false
    t.integer "position", null: false
    t.bigint "technical_stack_id", null: false
    t.datetime "updated_at", null: false
    t.index ["intern_profile_id", "position"], name: "idx_profile_stack_positions", unique: true
    t.index ["intern_profile_id", "technical_stack_id"], name: "idx_profile_stacks_unique", unique: true
    t.index ["intern_profile_id"], name: "index_intern_profile_technical_stacks_on_intern_profile_id"
    t.index ["technical_stack_id"], name: "index_intern_profile_technical_stacks_on_technical_stack_id"
    t.check_constraint "\"position\" >= 0 AND \"position\" <= 19", name: "profile_stack_position_check"
  end

  create_table "intern_profiles", force: :cascade do |t|
    t.text "bio", null: false
    t.datetime "created_at", null: false
    t.string "desired_role", limit: 100
    t.string "display_name", limit: 50, null: false
    t.string "grade", null: false
    t.datetime "published_at", null: false
    t.string "school_name", limit: 100, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_intern_profiles_on_user_id", unique: true
    t.check_constraint "grade::text = ANY (ARRAY['1年'::character varying, '2年'::character varying, '3年'::character varying, '4年'::character varying, '5年'::character varying, '修士1年'::character varying, '修士2年'::character varying, '博士課程'::character varying, 'その他'::character varying]::text[])", name: "intern_profiles_grade_check"
  end

  create_table "job_posting_technical_stacks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_posting_id", null: false
    t.integer "position", null: false
    t.bigint "technical_stack_id", null: false
    t.datetime "updated_at", null: false
    t.index ["job_posting_id", "position"], name: "idx_job_stack_positions", unique: true
    t.index ["job_posting_id", "technical_stack_id"], name: "idx_job_stacks_unique", unique: true
    t.index ["job_posting_id"], name: "index_job_posting_technical_stacks_on_job_posting_id"
    t.index ["technical_stack_id"], name: "index_job_posting_technical_stacks_on_technical_stack_id"
    t.check_constraint "\"position\" >= 0 AND \"position\" <= 19", name: "job_stack_position_check"
  end

  create_table "job_postings", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.text "description", null: false
    t.datetime "published_at"
    t.string "status", default: "draft", null: false
    t.string "title", limit: 100, null: false
    t.datetime "updated_at", null: false
    t.text "work_conditions", null: false
    t.index ["company_id"], name: "index_job_postings_on_company_id"
    t.index ["status", "published_at", "id"], name: "index_job_postings_on_status_and_published_at_and_id"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying]::text[])", name: "job_postings_status_check"
  end

  create_table "login_throttles", force: :cascade do |t|
    t.datetime "blocked_until"
    t.datetime "created_at", null: false
    t.integer "failure_count", default: 0, null: false
    t.string "key_digest", null: false
    t.datetime "updated_at", null: false
    t.datetime "window_started_at", null: false
    t.index ["key_digest"], name: "index_login_throttles_on_key_digest", unique: true
  end

  create_table "messages", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.bigint "sender_id", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at", "id"], name: "index_messages_on_conversation_id_and_created_at_and_id"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
    t.index ["sender_id"], name: "index_messages_on_sender_id"
    t.check_constraint "kind::text = ANY (ARRAY['scout'::character varying, 'normal'::character varying, 'application'::character varying]::text[])", name: "messages_kind_check"
  end

  create_table "technical_stacks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", limit: 50, null: false
    t.string "normalized_name", limit: 50, null: false
    t.datetime "updated_at", null: false
    t.index ["normalized_name"], name: "index_technical_stacks_on_normalized_name", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "reset_password_digest"
    t.datetime "reset_password_sent_at"
    t.string "role", null: false
    t.integer "session_version", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_digest"], name: "index_users_on_reset_password_digest", unique: true
    t.check_constraint "role::text = ANY (ARRAY['intern'::character varying, 'company'::character varying]::text[])", name: "users_role_check"
  end

  add_foreign_key "applications", "conversations"
  add_foreign_key "applications", "job_postings"
  add_foreign_key "applications", "messages"
  add_foreign_key "applications", "users", column: "intern_user_id"
  add_foreign_key "companies", "users", on_delete: :cascade
  add_foreign_key "conversations", "users", column: "company_user_id"
  add_foreign_key "conversations", "users", column: "intern_user_id"
  add_foreign_key "intern_profile_technical_stacks", "intern_profiles", on_delete: :cascade
  add_foreign_key "intern_profile_technical_stacks", "technical_stacks", on_delete: :cascade
  add_foreign_key "intern_profiles", "users", on_delete: :cascade
  add_foreign_key "job_posting_technical_stacks", "job_postings", on_delete: :cascade
  add_foreign_key "job_posting_technical_stacks", "technical_stacks", on_delete: :cascade
  add_foreign_key "job_postings", "companies"
  add_foreign_key "messages", "conversations"
  add_foreign_key "messages", "users", column: "sender_id"
end
