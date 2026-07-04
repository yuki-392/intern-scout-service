require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "valid intern user is saved" do
    user = build_user

    assert user.save
    assert_equal "intern", user.role
  end

  test "email is stripped and normalized to lowercase" do
    user = build_user(email: "  Intern@Example.COM ")

    assert user.save
    assert_equal "intern@example.com", user.email
  end

  test "email uniqueness is case insensitive" do
    assert build_user(email: "intern@example.com").save

    duplicate = build_user(email: "INTERN@example.com")

    assert_not duplicate.save
    assert duplicate.errors.of_kind?(:email, :taken)
  end

  test "role must be intern or company" do
    user = build_user(role: "admin")

    assert_not user.save
    assert user.errors.of_kind?(:role, :inclusion)
  end

  test "password must contain at least eight characters" do
    user = build_user(password: "short7", password_confirmation: "short7")

    assert_not user.save
    assert user.errors.of_kind?(:password, :too_short)
  end

  test "password must not exceed seventy two bytes" do
    password = "a" * 73
    user = build_user(password:, password_confirmation: password)

    assert_not user.save
    assert_includes user.errors.attribute_names, :password
  end

  test "database enforces unique email and valid role" do
    assert User.connection.index_exists?(:users, :email, unique: true)

    role_constraints = User.connection.check_constraints(:users).filter_map do |constraint|
      constraint.expression if constraint.name == "users_role_check"
    end

    assert_equal 1, role_constraints.size
    assert_match(/intern/, role_constraints.first)
    assert_match(/company/, role_constraints.first)
  end

  test "password reset token is single use and expires" do
    user = build_user
    user.save!
    token = user.issue_password_reset_token!

    assert user.valid_password_reset_token?(token)
    assert_not_equal token, user.reset_password_digest
    assert_not user.valid_password_reset_token?("wrong-token")

    user.update_column(:reset_password_sent_at, 31.minutes.ago)
    assert_not user.reload.valid_password_reset_token?(token)
  end

  private

  def build_user(overrides = {})
    defaults = {
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123",
      role: "intern"
    }

    User.new(defaults.merge(overrides))
  end
end
