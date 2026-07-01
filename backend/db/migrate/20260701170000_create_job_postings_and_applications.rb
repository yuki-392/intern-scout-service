class CreateJobPostingsAndApplications < ActiveRecord::Migration[8.1]
  def change
    create_table :job_postings do |t|
      t.references :company, null: false, foreign_key: true
      t.string :title, null: false, limit: 100
      t.text :description, null: false
      t.text :work_conditions, null: false
      t.string :status, null: false, default: "draft"
      t.datetime :published_at
      t.timestamps
    end
    add_check_constraint :job_postings, "status IN ('draft', 'published')", name: "job_postings_status_check"
    add_index :job_postings, %i[status published_at id]

    create_table :job_posting_technical_stacks do |t|
      t.references :job_posting, null: false, foreign_key: { on_delete: :cascade }
      t.references :technical_stack, null: false, foreign_key: { on_delete: :cascade }
      t.integer :position, null: false
      t.timestamps
    end
    add_index :job_posting_technical_stacks, %i[job_posting_id technical_stack_id], unique: true, name: "idx_job_stacks_unique"
    add_index :job_posting_technical_stacks, %i[job_posting_id position], unique: true, name: "idx_job_stack_positions"
    add_check_constraint :job_posting_technical_stacks, "position BETWEEN 0 AND 19", name: "job_stack_position_check"

    create_table :applications do |t|
      t.references :job_posting, null: false, foreign_key: true
      t.references :intern_user, null: false, foreign_key: { to_table: :users }
      t.references :conversation, null: false, foreign_key: true
      t.references :message, null: false, foreign_key: true
      t.timestamps
    end
    add_index :applications, %i[job_posting_id intern_user_id], unique: true
  end
end
