require "test_helper"

class ApiV1MeInternProfilesTest < ActionDispatch::IntegrationTest
  setup do
    @previous_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @previous_forgery_protection
  end

  test "returns null when the intern has no profile" do
    sign_in(create_user)

    get "/api/v1/me/intern_profile"

    assert_response :success
    assert_nil response.parsed_body["data"]
  end

  test "creates and publishes a profile with ordered technical stacks" do
    sign_in(create_user)

    assert_difference -> { InternProfile.count }, 1 do
      assert_difference -> { TechnicalStack.count }, 2 do
        update_profile(valid_profile_params)
      end
    end

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal [ "Ruby", "Rails" ], data["technical_stacks"]
    assert data["published"]
    assert data["published_at"].present?
    assert_not_includes response.body, "user_id"
    assert_not_includes response.body, "email"
  end

  test "updates the same profile and keeps its publication time" do
    user = create_user
    sign_in(user)
    update_profile(valid_profile_params)
    published_at = user.reload.intern_profile.published_at

    assert_no_difference -> { InternProfile.count } do
      update_profile(valid_profile_params(display_name: "更新後", technical_stacks: [ "TypeScript" ]))
    end

    assert_response :success
    assert_equal "更新後", user.reload.intern_profile.display_name
    assert_equal published_at, user.intern_profile.published_at
    assert_equal [ "TypeScript" ], response.parsed_body.dig("data", "technical_stacks")
  end

  test "returns all field errors and leaves an existing profile unchanged" do
    user = create_user
    sign_in(user)
    update_profile(valid_profile_params)
    original = user.reload.intern_profile.attributes

    update_profile(
      valid_profile_params(
        display_name: "",
        school_name: "",
        grade: "6年",
        bio: "",
        technical_stacks: [ "Ruby", " ＲＵＢＹ " ]
      )
    )

    assert_response :unprocessable_entity
    fields = response.parsed_body.fetch("errors").pluck("field")
    assert_includes fields, "display_name"
    assert_includes fields, "school_name"
    assert_includes fields, "grade"
    assert_includes fields, "bio"
    assert_includes fields, "technical_stacks"
    assert_equal original, user.reload.intern_profile.attributes
  end

  test "accepts twenty stacks and rejects twenty one" do
    user = create_user
    sign_in(user)
    update_profile(valid_profile_params(technical_stacks: 20.times.map { |index| "Stack#{index}" }))
    assert_response :success

    update_profile(valid_profile_params(technical_stacks: 21.times.map { |index| "Stack#{index}" }))
    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("errors").pluck("field"), "technical_stacks"
  end

  test "requires authentication and intern role" do
    get "/api/v1/me/intern_profile"
    assert_response :unauthorized

    sign_in(create_user(role: "company", email: "company@example.com"))
    get "/api/v1/me/intern_profile"
    assert_response :forbidden
    assert_equal "role_not_allowed", response.parsed_body.dig("errors", 0, "code")
  end

  test "rejects update without csrf token" do
    sign_in(create_user)

    patch "/api/v1/me/intern_profile",
      params: { intern_profile: valid_profile_params },
      as: :json

    assert_response :unprocessable_entity
    assert_equal "invalid_csrf_token", response.parsed_body.dig("errors", 0, "code")
  end

  private

  def create_user(role: "intern", email: "intern@example.com")
    User.create!(
      role:,
      email:,
      password: "password123",
      password_confirmation: "password123"
    )
  end

  def sign_in(user)
    post "/api/v1/auth/session",
      params: { session: { email: user.email, password: "password123" } },
      headers: csrf_headers,
      as: :json
    assert_response :success
  end

  def update_profile(profile_params)
    patch "/api/v1/me/intern_profile",
      params: { intern_profile: profile_params },
      headers: csrf_headers,
      as: :json
  end

  def csrf_headers
    get "/api/v1/auth/csrf"
    assert_response :success
    { "X-CSRF-Token" => response.parsed_body.dig("data", "csrf_token") }
  end

  def valid_profile_params(overrides = {})
    {
      display_name: "たかし",
      school_name: "Example大学",
      grade: "3年",
      bio: "Web開発を学んでいます。",
      desired_role: "バックエンドエンジニア",
      technical_stacks: [ "Ruby", "Rails" ]
    }.merge(overrides)
  end
end
