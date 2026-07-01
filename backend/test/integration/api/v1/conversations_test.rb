require "test_helper"

class ApiV1ConversationsTest < ActionDispatch::IntegrationTest
  test "company starts a scout conversation atomically" do
    company, profile = setup_people
    sign_in(company)

    assert_difference [ -> { Conversation.count }, -> { Message.count } ], 1 do
      start_scout(profile.id, "はじめまして")
    end

    assert_response :created
    assert_equal "scout", response.parsed_body.dig("data", "message", "kind")
    assert_equal company.id, Message.last.sender_id
  end

  test "existing conversation is reused and only message increases" do
    company, profile = setup_people
    conversation = Conversation.create!(company_user: company, intern_user: profile.user, last_messaged_at: 1.day.ago)
    sign_in(company)

    assert_no_difference -> { Conversation.count } do
      assert_difference -> { Message.count }, 1 do
        start_scout(profile.id, "追加のご連絡です")
      end
    end
    assert_equal conversation.id, response.parsed_body.dig("data", "conversation_id")
  end

  test "invalid body leaves no conversation or message" do
    company, profile = setup_people
    sign_in(company)

    [ " ", "a" * 2_001 ].each do |body|
      assert_no_difference [ -> { Conversation.count }, -> { Message.count } ] do
        start_scout(profile.id, body)
      end
      assert_response :unprocessable_entity
    end
  end

  test "intern cannot start and deleted target is hidden" do
    company, profile = setup_people
    sign_in(profile.user)
    start_scout(profile.id, "hello")
    assert_response :forbidden

    delete "/api/v1/auth/session", headers: csrf_headers
    profile.user.update!(deleted_at: Time.current)
    sign_in(company)
    start_scout(profile.id, "hello")
    assert_response :not_found
  end

  test "list returns only own conversations twenty at a time" do
    company = create_user(:company, "company@example.com")
    other_company = create_user(:company, "other@example.com")
    Company.create!(user: company, name: "Example Inc.")
    Company.create!(user: other_company, name: "Other Inc.")
    21.times do |index|
      intern = create_user(:intern, "intern#{index}@example.com")
      create_profile(intern, index)
      create_conversation(company, intern, "message#{index}", index.minutes.ago)
    end
    outsider = create_user(:intern, "outsider@example.com")
    create_profile(outsider, 99)
    create_conversation(other_company, outsider, "private", Time.current)
    sign_in(company)

    get "/api/v1/conversations", params: { page: 1 }

    assert_response :success
    assert_equal 20, response.parsed_body.fetch("data").size
    assert_equal 21, response.parsed_body.dig("meta", "total_count")
    assert_not_includes response.body, "private"
  end

  test "participant sees latest fifty messages in chronological order" do
    company, profile = setup_people
    conversation = Conversation.create!(company_user: company, intern_user: profile.user, last_messaged_at: Time.current)
    51.times { |index| Message.create!(conversation:, sender: index.even? ? company : profile.user, body: "message#{index}", kind: "normal", created_at: index.minutes.ago) }
    sign_in(profile.user)

    get "/api/v1/conversations/#{conversation.id}", params: { page: 1 }

    assert_response :success
    messages = response.parsed_body.dig("data", "messages")
    assert_equal 50, messages.size
    assert_equal messages.sort_by { |message| [ message["created_at"], message["id"] ] }, messages
  end

  test "participant replies while forged sender and kind are ignored" do
    company, profile = setup_people
    conversation = Conversation.create!(company_user: company, intern_user: profile.user, last_messaged_at: Time.current)
    outsider = create_user(:company, "outsider@example.com")
    sign_in(profile.user)

    post "/api/v1/conversations/#{conversation.id}/messages",
      params: { message: { body: "返信です", sender_id: outsider.id, kind: "application" } },
      headers: csrf_headers,
      as: :json

    assert_response :created
    message = Message.last
    assert_equal profile.user.id, message.sender_id
    assert_equal "normal", message.kind
  end

  test "outsider gets same not found response for reading and sending" do
    company, profile = setup_people
    conversation = Conversation.create!(company_user: company, intern_user: profile.user, last_messaged_at: Time.current)
    sign_in(create_user(:company, "outsider@example.com"))

    get "/api/v1/conversations/#{conversation.id}"
    assert_not_found
    post "/api/v1/conversations/#{conversation.id}/messages", params: { message: { body: "侵入" } }, headers: csrf_headers, as: :json
    assert_not_found
  end

  test "closed conversation rejects new messages but keeps history" do
    company, profile = setup_people
    conversation = create_conversation(company, profile.user, "old", 1.day.ago)
    profile.user.update!(deleted_at: Time.current)
    sign_in(company)

    get "/api/v1/conversations/#{conversation.id}"
    assert_response :success
    assert_equal false, response.parsed_body.dig("data", "can_send")
    post "/api/v1/conversations/#{conversation.id}/messages", params: { message: { body: "new" } }, headers: csrf_headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "conversation_closed", response.parsed_body.dig("errors", 0, "code")
  end

  private

  def setup_people
    company = create_user(:company, "company@example.com")
    Company.create!(user: company, name: "Example Inc.")
    intern = create_user(:intern, "intern@example.com")
    profile = InternProfile.create!(user: intern, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "紹介")
    [ company, profile ]
  end

  def create_user(role, email)
    User.create!(role:, email:, password: "password123", password_confirmation: "password123")
  end

  def create_conversation(company, intern, body, created_at)
    conversation = Conversation.create!(company_user: company, intern_user: intern, last_messaged_at: created_at)
    Message.create!(conversation:, sender: company, body:, kind: "scout", created_at:)
    conversation
  end

  def create_profile(user, index)
    InternProfile.create!(
      user:,
      display_name: "候補者#{index}",
      school_name: "Example大学",
      grade: "3年",
      bio: "自己紹介"
    )
  end

  def sign_in(user)
    post "/api/v1/auth/session", params: { session: { email: user.email, password: "password123" } }, headers: csrf_headers, as: :json
    assert_response :success
  end

  def start_scout(profile_id, body)
    post "/api/v1/conversations", params: { conversation: { intern_profile_id: profile_id, body: } }, headers: csrf_headers, as: :json
  end

  def csrf_headers
    get "/api/v1/auth/csrf"
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end

  def assert_not_found
    assert_response :not_found
    assert_equal "not_found", response.parsed_body.dig("errors", 0, "code")
  end
end
