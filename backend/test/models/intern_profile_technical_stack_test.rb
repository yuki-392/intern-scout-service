require "test_helper"

class InternProfileTechnicalStackTest < ActiveSupport::TestCase
  test "same stack cannot be attached twice to one profile" do
    profile = create_profile
    stack = TechnicalStack.create!(name: "Ruby")
    InternProfileTechnicalStack.create!(intern_profile: profile, technical_stack: stack, position: 0)

    duplicate = InternProfileTechnicalStack.new(
      intern_profile: profile,
      technical_stack: stack,
      position: 1
    )

    assert_not duplicate.save
  end

  test "position must be between zero and nineteen" do
    association = InternProfileTechnicalStack.new(
      intern_profile: create_profile,
      technical_stack: TechnicalStack.create!(name: "Ruby"),
      position: 20
    )

    assert_not association.save
    assert association.errors.of_kind?(:position, :inclusion)
  end

  private

  def create_profile
    user = User.create!(
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    InternProfile.create!(
      user:,
      display_name: "たかし",
      school_name: "Example大学",
      grade: "3年",
      bio: "Web開発を学んでいます。"
    )
  end
end
