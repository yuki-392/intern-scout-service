class CreateConversationsAndMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations do |t|
      t.references :company_user, null: false, foreign_key: { to_table: :users }
      t.references :intern_user, null: false, foreign_key: { to_table: :users }
      t.datetime :last_messaged_at, null: false
      t.timestamps
    end
    add_index :conversations, %i[company_user_id intern_user_id], unique: true
    add_index :conversations, %i[last_messaged_at id], order: { last_messaged_at: :desc, id: :desc }
    add_check_constraint :conversations, "company_user_id <> intern_user_id", name: "conversation_participants_differ"

    create_table :messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.references :sender, null: false, foreign_key: { to_table: :users }
      t.text :body, null: false
      t.string :kind, null: false
      t.timestamps
    end
    add_index :messages, %i[conversation_id created_at id]
    add_check_constraint :messages, "kind IN ('scout', 'normal', 'application')", name: "messages_kind_check"
  end
end
