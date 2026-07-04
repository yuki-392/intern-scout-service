require "test_helper"

class ApiV1MeAccountDeletionTest < ActionDispatch::IntegrationTest
  setup do
    @original_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @original_forgery_protection
  end

  test "deletes intern profile anonymizes credentials preserves shared history and signs out" do
    company, posting = create_company_context
    intern = create_intern
    conversation, message, application = create_application_history(company, posting, intern)
    original_email = intern.email
    original_digest = intern.password_digest
    original_session_version = intern.session_version
    sign_in(intern)

    delete_account("password123")

    assert_response :no_content
    intern.reload
    assert_nil intern.intern_profile
    assert intern.deleted_at.present?
    assert_not_equal original_email, intern.email
    assert_match(/@deleted\.invalid\z/, intern.email)
    assert_not_equal original_digest, intern.password_digest
    assert_operator intern.session_version, :>, original_session_version
    assert Conversation.exists?(conversation.id)
    assert Message.exists?(message.id)
    assert Application.exists?(application.id)
    get "/api/v1/me"
    assert_response :unauthorized
  end

  test "company is anonymized and all postings become draft while history remains" do
    company, posting = create_company_context
    intern = create_intern
    conversation, message, application = create_application_history(company, posting, intern)
    sign_in(company.user)

    delete_account("password123")

    assert_response :no_content
    assert_equal "退会済み企業-#{company.id}", company.reload.name
    assert_equal [ "draft" ], company.job_postings.reload.pluck(:status).uniq
    assert JobPosting.exists?(posting.id)
    assert Conversation.exists?(conversation.id)
    assert Message.exists?(message.id)
    assert Application.exists?(application.id)
  end

  test "wrong password changes nothing" do
    intern = create_intern
    original = intern.attributes
    sign_in(intern)

    delete_account("wrong-password")

    assert_response :unprocessable_entity
    assert_equal "invalid_password", response.parsed_body.dig("errors", 0, "code")
    assert_equal original, intern.reload.attributes
    assert intern.intern_profile.present?
  end

  test "requires authentication and csrf" do
    delete "/api/v1/me/account",
      params: { account: { password: "password123" } },
      headers: csrf_headers,
      as: :json
    assert_response :unauthorized

    intern = create_intern
    sign_in(intern)
    delete "/api/v1/me/account", params: { account: { password: "password123" } }, as: :json
    assert_response :unprocessable_entity
    assert_nil intern.reload.deleted_at
  end

  test "deleted user cannot log in again" do
    intern = create_intern
    email = intern.email
    sign_in(intern)
    delete_account("password123")

    post "/api/v1/auth/session",
      params: { session: { email:, password: "password123" } },
      headers: csrf_headers,
      as: :json
    assert_response :unauthorized
    assert_equal "invalid_credentials", response.parsed_body.dig("errors", 0, "code")
  end

  private

  def create_intern
    user = User.create!(role: "intern", email: "intern@example.com", password: "password123", password_confirmation: "password123")
    InternProfile.create!(user:, display_name: "たかし", school_name: "大学", grade: "3年", bio: "紹介")
    user
  end

  def create_company_context
    user = User.create!(role: "company", email: "company@example.com", password: "password123", password_confirmation: "password123")
    company = Company.create!(user:, name: "Example Inc.")
    posting = JobPosting.create!(company:, title: "募集", description: "業務", work_conditions: "条件", status: "published")
    [ company, posting ]
  end

  def create_application_history(company, posting, intern)
    conversation = Conversation.create!(company_user: company.user, intern_user: intern, last_messaged_at: Time.current)
    message = Message.create!(conversation:, sender: intern, body: "応募", kind: "application")
    application = Application.create!(job_posting: posting, intern_user: intern, conversation:, message:)
    [ conversation, message, application ]
  end

  def sign_in(user)
    post "/api/v1/auth/session", params: { session: { email: user.email, password: "password123" } }, headers: csrf_headers, as: :json
    assert_response :success
  end

  def delete_account(password)
    delete "/api/v1/me/account", params: { account: { password: } }, headers: csrf_headers, as: :json
  end

  def csrf_headers
    get "/api/v1/auth/csrf"
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end
end
