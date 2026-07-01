require "test_helper"

class ConversationTest < ActiveSupport::TestCase
  test "valid company and intern pair is saved" do
    conversation = build_conversation
    assert conversation.save
  end

  test "participant roles must match" do
    conversation = build_conversation(company_user: create_user(:intern, "wrong@example.com"))
    assert_not conversation.save
    assert_includes conversation.errors.attribute_names, :company_user
  end

  test "same participant pair is unique" do
    first = build_conversation
    first.save!
    duplicate = Conversation.new(company_user: first.company_user, intern_user: first.intern_user, last_messaged_at: Time.current)
    assert_not duplicate.save
  end

  test "database has pair and participant constraints" do
    assert Conversation.connection.index_exists?(:conversations, %i[company_user_id intern_user_id], unique: true)
    assert Conversation.connection.check_constraints(:conversations).any? { |constraint| constraint.name == "conversation_participants_differ" }
  end

  private

  def build_conversation(overrides = {})
    Conversation.new({
      company_user: create_user(:company, "company@example.com"),
      intern_user: create_user(:intern, "intern@example.com"),
      last_messaged_at: Time.current
    }.merge(overrides))
  end

  def create_user(role, email)
    User.create!(role:, email:, password: "password123", password_confirmation: "password123")
  end
end
