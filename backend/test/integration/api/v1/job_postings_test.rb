require "test_helper"

class ApiV1JobPostingsTest < ActionDispatch::IntegrationTest
  test "company creates and updates own posting with stacks atomically" do
    company = create_company("company@example.com", "Example Inc.")
    sign_in(company.user)
    assert_difference -> { JobPosting.count }, 1 do
      post "/api/v1/company/job_postings", params: { job_posting: posting_params }, headers: csrf_headers, as: :json
    end
    assert_response :created
    posting = JobPosting.last
    assert_equal [ "Ruby", "Rails" ], response.parsed_body.dig("data", "technical_stacks")

    patch "/api/v1/company/job_postings/#{posting.id}", params: { job_posting: posting_params(title: "更新", technical_stacks: [ "TypeScript" ]) }, headers: csrf_headers, as: :json
    assert_response :success
    assert_equal "更新", posting.reload.title
  end

  test "company cannot view or update another company posting" do
    owner = create_company("owner@example.com", "Owner")
    posting = create_posting(owner)
    sign_in(create_company("other@example.com", "Other").user)
    get "/api/v1/company/job_postings/#{posting.id}"
    assert_response :not_found
    patch "/api/v1/company/job_postings/#{posting.id}", params: { job_posting: posting_params }, headers: csrf_headers, as: :json
    assert_response :not_found
  end

  test "invalid update preserves posting and stacks" do
    company = create_company("company@example.com", "Example")
    posting = create_posting(company, stacks: [ "Ruby" ])
    sign_in(company.user)
    original = posting.attributes
    patch "/api/v1/company/job_postings/#{posting.id}", params: { job_posting: posting_params(title: "", technical_stacks: [ "Ruby", " ＲＵＢＹ " ]) }, headers: csrf_headers, as: :json
    assert_response :unprocessable_entity
    assert_equal original, posting.reload.attributes
    assert_equal [ "Ruby" ], posting.technical_stacks.pluck(:name)
  end

  test "intern sees only active published postings twenty at a time" do
    company = create_company("company@example.com", "Example")
    21.times { |index| create_posting(company, title: "公開#{index}", published_at: Time.current + index.seconds) }
    create_posting(company, title: "非公開", status: "draft")
    intern = create_intern
    sign_in(intern)
    get "/api/v1/job_postings", params: { page: 1 }
    assert_response :success
    assert_equal 20, response.parsed_body.fetch("data").size
    assert_equal 21, response.parsed_body.dig("meta", "total_count")
    assert_not_includes response.body, "非公開"
    assert_not_includes response.body, "company@example.com"
  end

  test "draft and deleted company posting use not found" do
    company = create_company("company@example.com", "Example")
    draft = create_posting(company, status: "draft")
    published = create_posting(company, title: "published")
    intern = create_intern
    sign_in(intern)
    get "/api/v1/job_postings/#{draft.id}"
    assert_not_found
    company.user.update!(deleted_at: Time.current)
    get "/api/v1/job_postings/#{published.id}"
    assert_not_found
  end

  test "application creates record conversation and automatic message" do
    company = create_company("company@example.com", "Example")
    posting = create_posting(company, title: "Railsインターン")
    intern = create_intern
    sign_in(intern)
    assert_difference [ -> { Application.count }, -> { Conversation.count }, -> { Message.count } ], 1 do
      apply(posting)
    end
    assert_response :created
    message = Message.last
    assert_equal "application", message.kind
    assert_equal intern.id, message.sender_id
    assert_equal "募集『Railsインターン』に応募しました。プロフィールをご確認ください。", message.body
  end

  test "application reuses conversation and duplicate does not add records" do
    company = create_company("company@example.com", "Example")
    posting = create_posting(company)
    intern = create_intern
    conversation = Conversation.create!(company_user: company.user, intern_user: intern, last_messaged_at: Time.current)
    sign_in(intern)
    assert_no_difference -> { Conversation.count } do
      apply(posting)
    end
    assert_equal conversation.id, Application.last.conversation_id
    assert_no_difference [ -> { Application.count }, -> { Message.count } ] do
      apply(posting)
    end
    assert_response :conflict
    assert_equal "already_applied", response.parsed_body.dig("errors", 0, "code")
  end

  test "unpublishing keeps existing application conversation and message" do
    company = create_company("company@example.com", "Example")
    posting = create_posting(company)
    intern = create_intern
    sign_in(intern)
    apply(posting)
    ids = [ Application.last.id, Conversation.last.id, Message.last.id ]
    posting.update!(status: "draft")
    assert_equal ids, [ Application.last.id, Conversation.last.id, Message.last.id ]
  end

  private

  def create_company(email, name)
    user = User.create!(role: "company", email:, password: "password123", password_confirmation: "password123")
    Company.create!(user:, name:)
  end
  def create_intern
    user = User.create!(role: "intern", email: "intern@example.com", password: "password123", password_confirmation: "password123")
    InternProfile.create!(user:, display_name: "たかし", school_name: "大学", grade: "3年", bio: "紹介")
    user
  end
  def create_posting(company, title: "募集", status: "published", stacks: [], published_at: Time.current)
    posting = JobPosting.create!(company:, title:, description: "業務", work_conditions: "条件", status:, published_at: status == "published" ? published_at : nil)
    stacks.each_with_index do |name, position|
      stack = TechnicalStack.find_or_create_by!(normalized_name: TechnicalStack.normalize_name(name)) { |item| item.name = name }
      JobPostingTechnicalStack.create!(job_posting: posting, technical_stack: stack, position:)
    end
    posting
  end
  def posting_params(overrides = {})
    { title: "募集", description: "業務", work_conditions: "条件", status: "published", technical_stacks: [ "Ruby", "Rails" ] }.merge(overrides)
  end
  def sign_in(user)
    post "/api/v1/auth/session", params: { session: { email: user.email, password: "password123" } }, headers: csrf_headers, as: :json
  end
  def apply(posting)
    post "/api/v1/job_postings/#{posting.id}/applications", headers: csrf_headers, as: :json
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
