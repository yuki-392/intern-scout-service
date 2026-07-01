require "test_helper"

class CompanyTest < ActiveSupport::TestCase
  test "company belongs to a company user" do
    user = create_user(role: "company", email: "company@example.com")
    company = Company.new(user:, name: " Example Inc. ")

    assert company.save
    assert_equal "Example Inc.", company.name
  end

  test "company name is required" do
    user = create_user(role: "company", email: "company@example.com")
    company = Company.new(user:, name: " ")

    assert_not company.save
    assert company.errors.of_kind?(:name, :blank)
  end

  test "company name must not exceed one hundred characters" do
    user = create_user(role: "company", email: "company@example.com")
    company = Company.new(user:, name: "a" * 101)

    assert_not company.save
    assert company.errors.of_kind?(:name, :too_long)
  end

  test "intern user cannot own a company" do
    user = create_user(role: "intern", email: "intern@example.com")
    company = Company.new(user:, name: "Example Inc.")

    assert_not company.save
    assert_includes company.errors.attribute_names, :user
  end

  test "user can own only one company" do
    user = create_user(role: "company", email: "company@example.com")
    assert Company.create!(user:, name: "First Inc.")

    duplicate = Company.new(user:, name: "Second Inc.")

    assert_not duplicate.save
    assert duplicate.errors.of_kind?(:user_id, :taken)
  end

  private

  def create_user(role:, email:)
    User.create!(
      role:,
      email:,
      password: "password123",
      password_confirmation: "password123"
    )
  end
end
