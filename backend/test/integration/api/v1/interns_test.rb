require "test_helper"

class ApiV1InternsTest < ActionDispatch::IntegrationTest
  test "returns only published active profiles twenty at a time" do
    sign_in_company
    21.times { |index| create_profile(index:) }
    deleted = create_profile(index: 31)
    deleted.user.update!(deleted_at: Time.current)

    get "/api/v1/interns", params: { page: 1 }

    assert_response :success
    assert_equal 20, response.parsed_body.fetch("data").size
    assert_equal 21, response.parsed_body.dig("meta", "total_count")
    assert_equal 2, response.parsed_body.dig("meta", "total_pages")
    assert_equal 1, response.parsed_body.dig("meta", "current_page")
    assert_equal 20, response.parsed_body.dig("meta", "per_page")
  end

  test "uses stable newest first pagination" do
    sign_in_company
    profiles = 21.times.map { |index| create_profile(index:, published_at: Time.current + index.seconds) }

    get "/api/v1/interns", params: { page: 2 }

    assert_response :success
    assert_equal [ profiles.first.id ], response.parsed_body.fetch("data").pluck("id")
  end

  test "filters each field by partial match and combines different fields with and" do
    sign_in_company
    match = create_profile(index: 1, school_name: "東京Example大学", desired_role: "Backend Engineer", stacks: [ "Ruby on Rails" ])
    create_profile(index: 2, school_name: "東京Example大学", desired_role: "Designer", stacks: [ "Ruby on Rails" ])
    create_profile(index: 3, school_name: "大阪大学", desired_role: "Backend Engineer", stacks: [ "Ruby on Rails" ])

    get "/api/v1/interns", params: {
      school_name: "example",
      desired_role: "BACKEND",
      technical_stack: "ｒｕｂｙ"
    }

    assert_response :success
    assert_equal [ match.id ], response.parsed_body.fetch("data").pluck("id")
  end

  test "escapes sql wildcard characters" do
    sign_in_company
    literal = create_profile(index: 1, school_name: "100%_School")
    create_profile(index: 2, school_name: "100xxSchool")

    get "/api/v1/interns", params: { school_name: "%_" }

    assert_response :success
    assert_equal [ literal.id ], response.parsed_body.fetch("data").pluck("id")
  end

  test "returns an empty successful page" do
    sign_in_company

    get "/api/v1/interns", params: { school_name: "該当なし" }

    assert_response :success
    assert_empty response.parsed_body.fetch("data")
    assert_equal 0, response.parsed_body.dig("meta", "total_count")
    assert_equal 0, response.parsed_body.dig("meta", "total_pages")
  end

  test "rejects invalid page and overlong filters" do
    sign_in_company

    get "/api/v1/interns", params: { page: 0, school_name: "a" * 101 }

    assert_response :unprocessable_entity
    fields = response.parsed_body.fetch("errors").pluck("field")
    assert_includes fields, "page"
    assert_includes fields, "school_name"
  end

  test "shows a published profile without private fields" do
    sign_in_company
    profile = create_profile(index: 1, stacks: [ "Ruby", "Rails" ])

    get "/api/v1/interns/#{profile.id}"

    assert_response :success
    assert_equal profile.id, response.parsed_body.dig("data", "id")
    assert_equal [ "Ruby", "Rails" ], response.parsed_body.dig("data", "technical_stacks")
    assert_not_includes response.body, "user_id"
    assert_not_includes response.body, "email"
    assert_not_includes response.body, "password"
  end

  test "uses the same not found response for missing and deleted profiles" do
    sign_in_company
    deleted = create_profile(index: 2)
    deleted.user.update!(deleted_at: Time.current)

    [ 999_999, deleted.id ].each do |id|
      get "/api/v1/interns/#{id}"
      assert_response :not_found
      assert_equal "not_found", response.parsed_body.dig("errors", 0, "code")
    end
  end

  test "requires authentication and company role" do
    get "/api/v1/interns"
    assert_response :unauthorized

    sign_in(create_user(role: "intern", email: "intern-viewer@example.com"))
    get "/api/v1/interns"
    assert_response :forbidden
    assert_equal "role_not_allowed", response.parsed_body.dig("errors", 0, "code")
  end

  private

  def sign_in_company
    sign_in(create_user(role: "company", email: "company@example.com"))
  end

  def sign_in(user)
    get "/api/v1/auth/csrf"
    token = response.parsed_body.dig("data", "csrf_token")
    post "/api/v1/auth/session",
      params: { session: { email: user.email, password: "password123" } },
      headers: { "X-CSRF-Token" => token },
      as: :json
    assert_response :success
  end

  def create_user(role:, email:)
    User.create!(role:, email:, password: "password123", password_confirmation: "password123")
  end

  def create_profile(index:, school_name: "Example大学", desired_role: "Backend Engineer", stacks: [], published_at: Time.current)
    user = create_user(role: "intern", email: "intern#{index}@example.com")
    profile = InternProfile.create!(
      user:,
      display_name: "候補者#{index}",
      school_name:,
      grade: "3年",
      bio: "自己紹介#{index}",
      desired_role:,
      published_at:
    )
    stacks.each_with_index do |name, position|
      stack = TechnicalStack.find_or_create_by!(normalized_name: TechnicalStack.normalize_name(name)) { |record| record.name = name }
      InternProfileTechnicalStack.create!(intern_profile: profile, technical_stack: stack, position:)
    end
    profile
  end
end
