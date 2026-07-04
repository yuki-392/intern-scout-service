class AddSecurityFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :session_version, :integer, null: false, default: 0
    add_column :users, :reset_password_digest, :string
    add_column :users, :reset_password_sent_at, :datetime
    add_index :users, :reset_password_digest, unique: true
  end
end
