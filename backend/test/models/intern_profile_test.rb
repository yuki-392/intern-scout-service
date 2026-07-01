require "test_helper"

class InternProfileTest < ActiveSupport::TestCase
  test "valid profile belongs to an intern and is published" do
    profile = build_profile

    assert profile.save
    assert profile.published_at.present?
  end

  test "company user cannot own an intern profile" do
    profile = build_profile(user: create_user(role: "company", email: "company@example.com"))

    assert_not profile.save
    assert_includes profile.errors.attribute_names, :user
  end

  test "required fields and grade are validated" do
    profile = build_profile(display_name: "", school_name: "", grade: "6年", bio: "")

    assert_not profile.save
    assert profile.errors.of_kind?(:display_name, :blank)
    assert profile.errors.of_kind?(:school_name, :blank)
    assert profile.errors.of_kind?(:grade, :inclusion)
    assert profile.errors.of_kind?(:bio, :blank)
  end

  test "text length boundaries are accepted" do
    profile = build_profile(
      display_name: "名" * 50,
      school_name: "学" * 100,
      bio: "紹" * 1_000,
      desired_role: "職" * 100
    )

    assert profile.save
  end

  test "text over maximum lengths is rejected" do
    profile = build_profile(
      display_name: "名" * 51,
      school_name: "学" * 101,
      bio: "紹" * 1_001,
      desired_role: "職" * 101
    )

    assert_not profile.save
    assert_equal %i[bio desired_role display_name school_name].sort,
      profile.errors.attribute_names.uniq.sort
  end

  test "one user can own only one profile" do
    user = create_user
    assert build_profile(user:).save

    duplicate = build_profile(user:)

    assert_not duplicate.save
    assert duplicate.errors.of_kind?(:user_id, :taken)
  end

  test "database has profile constraints" do
    assert InternProfile.connection.index_exists?(:intern_profiles, :user_id, unique: true)
    assert InternProfile.connection.foreign_key_exists?(:intern_profiles, :users)

    grade_constraint = InternProfile.connection.check_constraints(:intern_profiles).find do |constraint|
      constraint.name == "intern_profiles_grade_check"
    end
    assert grade_constraint
    assert_match(/博士課程/, grade_constraint.expression)
  end

  private

  def build_profile(overrides = {})
    user = overrides.delete(:user) || create_user
    defaults = {
      user:,
      display_name: "たかし",
      school_name: "Example大学",
      grade: "3年",
      bio: "Web開発を学んでいます。",
      desired_role: "バックエンドエンジニア"
    }
    InternProfile.new(defaults.merge(overrides))
  end

  def create_user(role: "intern", email: "intern@example.com")
    User.create!(
      role:,
      email:,
      password: "password123",
      password_confirmation: "password123"
    )
  end
end
