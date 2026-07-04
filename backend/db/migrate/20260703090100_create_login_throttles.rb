class CreateLoginThrottles < ActiveRecord::Migration[8.1]
  def change
    create_table :login_throttles do |t|
      t.string :key_digest, null: false
      t.integer :failure_count, null: false, default: 0
      t.datetime :window_started_at, null: false
      t.datetime :blocked_until
      t.timestamps
    end

    add_index :login_throttles, :key_digest, unique: true
  end
end
