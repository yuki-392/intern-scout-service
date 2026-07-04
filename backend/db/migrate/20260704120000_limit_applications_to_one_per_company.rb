class LimitApplicationsToOnePerCompany < ActiveRecord::Migration[8.1]
  def up
    add_reference :applications, :company, foreign_key: true
    execute <<~SQL.squish
      UPDATE applications
      SET company_id = job_postings.company_id
      FROM job_postings
      WHERE applications.job_posting_id = job_postings.id
    SQL
    change_column_null :applications, :company_id, false
    add_index :applications, %i[company_id intern_user_id], unique: true
  end

  def down
    remove_reference :applications, :company, foreign_key: true
  end
end
