require "test_helper"

class ApiV1AuthPasswordResetsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    ActionMailer::Base.deliveries.clear
    @user = User.create!(
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @previous_forgery_protection
  end

  test "request uses the same accepted response and only emails an active user" do
    perform_enqueued_jobs do
      post "/api/v1/auth/password_reset", params: { email: @user.email }, headers: csrf_headers, as: :json
    end
    assert_response :accepted
    assert_equal 1, ActionMailer::Base.deliveries.size
    assert_match %r{/reset-password#token=}, ActionMailer::Base.deliveries.last.body.encoded

    assert_no_enqueued_jobs do
      post "/api/v1/auth/password_reset", params: { email: "unknown@example.com" }, headers: csrf_headers, as: :json
    end
    assert_response :accepted
  end

  test "valid token changes password once and invalidates existing sessions" do
    token = @user.issue_password_reset_token!
    old_version = @user.session_version

    patch "/api/v1/auth/password_reset",
      params: { token:, password: "new-password123", password_confirmation: "new-password123" },
      headers: csrf_headers,
      as: :json

    assert_response :no_content
    assert @user.reload.authenticate("new-password123")
    assert_operator @user.session_version, :>, old_version
    assert_not @user.valid_password_reset_token?(token)

    patch "/api/v1/auth/password_reset",
      params: { token:, password: "another-password123", password_confirmation: "another-password123" },
      headers: csrf_headers,
      as: :json
    assert_response :unprocessable_entity
  end

  test "rejects expired token and invalid password confirmation" do
    token = @user.issue_password_reset_token!
    @user.update_column(:reset_password_sent_at, 31.minutes.ago)

    patch "/api/v1/auth/password_reset",
      params: { token:, password: "new-password123", password_confirmation: "different" },
      headers: csrf_headers,
      as: :json

    assert_response :unprocessable_entity
    assert @user.reload.authenticate("password123")
  end

  test "rejects a missing password without consuming the token" do
    token = @user.issue_password_reset_token!

    patch "/api/v1/auth/password_reset",
      params: { token: },
      headers: csrf_headers,
      as: :json

    assert_response :unprocessable_entity
    assert @user.reload.valid_password_reset_token?(token)
    assert @user.authenticate("password123")
  end

  private

  def csrf_headers
    get "/api/v1/auth/csrf"
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end
end
