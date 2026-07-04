require "test_helper"

class ApiV1AuthSessionsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @previous_forgery_protection
  end

  test "signs in and returns the current user" do
    user = create_user

    login(email: " INTERN@example.com ", password: "password123")

    assert_response :success
    assert_equal user.id, response.parsed_body.dig("data", "id")

    get "/api/v1/me"
    assert_response :success
    assert_equal user.id, response.parsed_body.dig("data", "id")
  end

  test "uses the same response for an unknown email" do
    login(email: "unknown@example.com", password: "password123")

    assert_invalid_credentials
  end

  test "uses the same response for a wrong password" do
    create_user

    login(email: "intern@example.com", password: "wrong-password")

    assert_invalid_credentials
  end

  test "uses the same response for a deleted user" do
    create_user.update!(deleted_at: Time.current)

    login(email: "intern@example.com", password: "password123")

    assert_invalid_credentials
  end

  test "signs out and invalidates the session" do
    create_user
    login(email: "intern@example.com", password: "password123")

    delete "/api/v1/auth/session", headers: csrf_headers
    assert_response :no_content

    get "/api/v1/me"
    assert_response :unauthorized
  end

  test "sign out invalidates a copied session cookie" do
    user = create_user
    login(email: user.email, password: "password123")
    stolen_cookie = cookies["_intern_scout_session"]

    delete "/api/v1/auth/session", headers: csrf_headers
    assert_response :no_content

    cookies["_intern_scout_session"] = stolen_cookie
    get "/api/v1/me"
    assert_response :unauthorized
  end

  test "rate limits repeated failed logins" do
    create_user

    5.times do
      login(email: "intern@example.com", password: "wrong-password")
      assert_response :unauthorized
    end

    login(email: "intern@example.com", password: "wrong-password")
    assert_response :too_many_requests
    assert_equal "too_many_login_attempts", response.parsed_body.dig("errors", 0, "code")
    assert response.headers["Retry-After"].present?
  end

  test "rejects sign out when unauthenticated" do
    delete "/api/v1/auth/session", headers: csrf_headers

    assert_response :unauthorized
    assert_equal "unauthenticated", response.parsed_body.dig("errors", 0, "code")
  end

  test "rejects login without csrf token" do
    create_user

    post "/api/v1/auth/session",
      params: { session: { email: "intern@example.com", password: "password123" } },
      as: :json

    assert_response :unprocessable_entity
    assert_equal "invalid_csrf_token", response.parsed_body.dig("errors", 0, "code")
  end

  test "does not expose authentication secrets" do
    create_user

    login(email: "intern@example.com", password: "password123")

    serialized = response.body
    assert_not_includes serialized, "password_digest"
    assert_not_includes serialized, "password123"
    assert_not_includes serialized, "deleted_at"
  end

  private

  def create_user
    User.create!(
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end

  def login(email:, password:)
    post "/api/v1/auth/session",
      params: { session: { email:, password: } },
      headers: csrf_headers,
      as: :json
  end

  def csrf_headers
    get "/api/v1/auth/csrf"
    assert_response :success
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end

  def assert_invalid_credentials
    assert_response :unauthorized
    assert_equal "invalid_credentials", response.parsed_body.dig("errors", 0, "code")
    assert_equal "メールアドレスまたはパスワードが正しくありません",
      response.parsed_body.dig("errors", 0, "message")
  end
end
