require "test_helper"

class ApiV1AuthRegistrationsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @previous_forgery_protection
  end

  test "registers and signs in an intern" do
    assert_difference -> { User.count }, 1 do
      assert_no_difference -> { Company.count } do
        register(user_params(role: "intern"))
      end
    end

    assert_response :created
    assert_equal "intern", response.parsed_body.dig("data", "role")
    assert_nil response.parsed_body.dig("data", "company")

    get "/api/v1/me"
    assert_response :success
    assert_equal "intern@example.com", response.parsed_body.dig("data", "email")
  end

  test "registers company user and company atomically" do
    params = user_params(
      role: "company",
      email: "company@example.com",
      company_name: "Example Inc."
    )

    assert_difference [ -> { User.count }, -> { Company.count } ], 1 do
      register(params)
    end

    assert_response :created
    assert_equal "company", response.parsed_body.dig("data", "role")
    assert_equal "Example Inc.", response.parsed_body.dig("data", "company", "name")
  end

  test "returns every detectable validation error in one response" do
    params = user_params(
      role: "company",
      email: "invalid",
      password: "short",
      password_confirmation: "different",
      company_name: ""
    )

    assert_no_difference [ -> { User.count }, -> { Company.count } ] do
      register(params)
    end

    assert_response :unprocessable_entity
    fields = response.parsed_body.fetch("errors").pluck("field")
    assert_includes fields, "email"
    assert_includes fields, "password"
    assert_includes fields, "password_confirmation"
    assert_includes fields, "company_name"
  end

  test "rejects duplicate email regardless of case" do
    User.create!(user_params(role: "intern", email: "intern@example.com"))

    assert_no_difference -> { User.count } do
      register(user_params(role: "intern", email: "INTERN@example.com"))
    end

    assert_response :unprocessable_entity
    assert_equal "email", response.parsed_body.dig("errors", 0, "field")
  end

  test "rejects an unknown role" do
    assert_no_difference -> { User.count } do
      register(user_params(role: "admin"))
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("errors").pluck("field"), "role"
  end

  test "does not accept registration without csrf token" do
    post "/api/v1/auth/registrations", params: { user: user_params(role: "intern") }, as: :json

    assert_response :unprocessable_entity
    assert_equal "invalid_csrf_token", response.parsed_body.dig("errors", 0, "code")
  end

  test "does not expose authentication secrets" do
    register(user_params(role: "intern"))

    serialized = response.body
    assert_not_includes serialized, "password_digest"
    assert_not_includes serialized, "password123"
    assert_not_includes serialized, "deleted_at"
  end

  test "demo mode only accepts reserved example addresses" do
    previous = ENV["DEMO_MODE"]
    ENV["DEMO_MODE"] = "true"

    assert_no_difference -> { User.count } do
      register(user_params(role: "intern", email: "real-user@gmail.com"))
    end

    assert_response :unprocessable_entity
    assert_equal "demo_email_required", response.parsed_body.dig("errors", 0, "code")
  ensure
    ENV["DEMO_MODE"] = previous
  end

  private

  def register(params)
    post "/api/v1/auth/registrations",
      params: { user: params },
      headers: csrf_headers,
      as: :json
  end

  def csrf_headers
    get "/api/v1/auth/csrf"
    assert_response :success
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end

  def user_params(overrides = {})
    {
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123"
    }.merge(overrides)
  end
end
