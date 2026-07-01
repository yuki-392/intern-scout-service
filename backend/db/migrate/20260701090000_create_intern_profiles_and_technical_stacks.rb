class CreateInternProfilesAndTechnicalStacks < ActiveRecord::Migration[8.1]
  GRADES = [ "1年", "2年", "3年", "4年", "5年", "修士1年", "修士2年", "博士課程", "その他" ]

  def change
    create_table :intern_profiles do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: { unique: true }
      t.string :display_name, null: false, limit: 50
      t.string :school_name, null: false, limit: 100
      t.string :grade, null: false
      t.text :bio, null: false
      t.string :desired_role, limit: 100
      t.datetime :published_at, null: false
      t.timestamps
    end
    quoted_grades = GRADES.map { |grade| connection.quote(grade) }.join(", ")
    add_check_constraint :intern_profiles, "grade IN (#{quoted_grades})", name: "intern_profiles_grade_check"

    create_table :technical_stacks do |t|
      t.string :name, null: false, limit: 50
      t.string :normalized_name, null: false, limit: 50
      t.timestamps
    end
    add_index :technical_stacks, :normalized_name, unique: true

    create_table :intern_profile_technical_stacks do |t|
      t.references :intern_profile, null: false, foreign_key: { on_delete: :cascade }
      t.references :technical_stack, null: false, foreign_key: { on_delete: :cascade }
      t.integer :position, null: false
      t.timestamps
    end
    add_index :intern_profile_technical_stacks,
      %i[intern_profile_id technical_stack_id], unique: true, name: "idx_profile_stacks_unique"
    add_index :intern_profile_technical_stacks,
      %i[intern_profile_id position], unique: true, name: "idx_profile_stack_positions"
    add_check_constraint :intern_profile_technical_stacks,
      "position BETWEEN 0 AND 19", name: "profile_stack_position_check"
  end
end
