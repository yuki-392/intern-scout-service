require "test_helper"

class SeedsTest < ActiveSupport::TestCase
  SEED_EMAILS = %w[
    company@demo.example
    startup@demo.example
    intern@demo.example
    frontend-intern@demo.example
    data-intern@demo.example
  ].freeze

  test "creates fictional data for search jobs scouting and applications" do
    load_seeds

    users = User.where(email: SEED_EMAILS)
    assert_equal 5, users.count
    assert_equal 2, users.where(role: "company").count
    assert_equal 3, users.where(role: "intern").count
    assert_equal 3, InternProfile.where(user: users).count
    assert_equal 3, JobPosting.joins(company: :user).where(users: { email: SEED_EMAILS }, status: "published").count
    assert TechnicalStack.where(normalized_name: %w[rails react python]).count >= 3

    companies = Company.where(user: users.where(role: "company"))
    assert_equal 2, companies.where.not(description: [ nil, "" ]).count
    assert_equal 2, companies.where.not(website_url: [ nil, "" ]).count

    conversations = Conversation.where(company_user: users, intern_user: users)
    assert_equal 2, conversations.count
    assert conversations.joins(:messages).where(messages: { kind: "scout" }).exists?
    assert conversations.joins(:messages).where(messages: { kind: "application" }).exists?
    assert Application.where(intern_user: users).exists?
    assert Message.exists?(kind: "application", body: "募集『Rails API開発インターン』に応募しました。プロフィールをご確認ください。")
  end

  test "is idempotent" do
    load_seeds
    first_counts = seed_counts

    load_seeds

    assert_equal first_counts, seed_counts
  end

  test "requires a demo password without leaving partial data" do
    previous_password = ENV.delete("DEMO_USER_PASSWORD")

    error = assert_raises(RuntimeError) { load Rails.root.join("db/seeds.rb") }

    assert_equal "DEMO_USER_PASSWORD must be set before loading demo seed data", error.message
    assert_not User.where(email: SEED_EMAILS).exists?
  ensure
    ENV["DEMO_USER_PASSWORD"] = previous_password
  end

  private

  def load_seeds
    previous_password = ENV["DEMO_USER_PASSWORD"]
    ENV["DEMO_USER_PASSWORD"] = SecureRandom.hex(16)
    load Rails.root.join("db/seeds.rb")
  ensure
    ENV["DEMO_USER_PASSWORD"] = previous_password
  end

  def seed_counts
    users = User.where(email: SEED_EMAILS)
    {
      users: users.count,
      profiles: InternProfile.where(user: users).count,
      companies: Company.where(user: users).count,
      postings: JobPosting.joins(company: :user).where(users: { email: SEED_EMAILS }).count,
      conversations: Conversation.where(company_user: users, intern_user: users).count,
      messages: Message.joins(:conversation).where(conversations: { company_user_id: users.select(:id) }).count,
      applications: Application.where(intern_user: users).count
    }
  end
end
