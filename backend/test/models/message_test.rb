require "test_helper"

class MessageTest < ActiveSupport::TestCase
  setup do
    company = create_user(:company, "company@example.com")
    intern = create_user(:intern, "intern@example.com")
    @conversation = Conversation.create!(company_user: company, intern_user: intern, last_messaged_at: 1.day.ago)
  end

  test "participant can send a valid message and touches conversation" do
    message = Message.new(conversation: @conversation, sender: @conversation.company_user, body: " scout ", kind: "scout")
    assert message.save
    assert_equal "scout", message.body
    assert @conversation.reload.last_messaged_at > 1.minute.ago
  end

  test "body boundaries are validated" do
    assert Message.new(conversation: @conversation, sender: @conversation.company_user, body: "a", kind: "normal").valid?
    assert Message.new(conversation: @conversation, sender: @conversation.company_user, body: "a" * 2_000, kind: "normal").valid?
    assert_not Message.new(conversation: @conversation, sender: @conversation.company_user, body: " ", kind: "normal").valid?
    assert_not Message.new(conversation: @conversation, sender: @conversation.company_user, body: "a" * 2_001, kind: "normal").valid?
  end

  test "sender must participate in conversation" do
    outsider = create_user(:company, "outsider@example.com")
    message = Message.new(conversation: @conversation, sender: outsider, body: "hello", kind: "normal")
    assert_not message.save
    assert_includes message.errors.attribute_names, :sender
  end

  test "kind is restricted" do
    message = Message.new(conversation: @conversation, sender: @conversation.intern_user, body: "hello", kind: "unknown")
    assert_not message.valid?
    assert message.errors.of_kind?(:kind, :inclusion)
  end

  private

  def create_user(role, email)
    User.create!(role:, email:, password: "password123", password_confirmation: "password123")
  end
end
