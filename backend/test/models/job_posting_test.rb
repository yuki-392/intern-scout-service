require "test_helper"

class JobPostingTest < ActiveSupport::TestCase
  setup do
    user = User.create!(role: "company", email: "company@example.com", password: "password123", password_confirmation: "password123")
    @company = Company.create!(user:, name: "Example Inc.")
  end

  test "valid boundaries can be published" do
    posting = JobPosting.new(company: @company, title: "a" * 100, description: "a" * 2_000, work_conditions: "a" * 1_000, status: "published")
    assert posting.save
    assert posting.published_at.present?
  end

  test "required fields maximum lengths and status are validated" do
    posting = JobPosting.new(company: @company, title: "a" * 101, description: "a" * 2_001, work_conditions: "a" * 1_001, status: "unknown")
    assert_not posting.save
    assert_equal %i[description status title work_conditions], posting.errors.attribute_names.uniq.sort
  end

  test "published timestamp remains after returning to draft" do
    posting = JobPosting.create!(company: @company, title: "募集", description: "業務", work_conditions: "条件", status: "published")
    published_at = posting.published_at
    posting.update!(status: "draft")
    assert_equal published_at, posting.published_at
  end

  test "database restricts status" do
    constraint = JobPosting.connection.check_constraints(:job_postings).find { |item| item.name == "job_postings_status_check" }
    assert constraint
    assert_match(/published/, constraint.expression)
  end
end
