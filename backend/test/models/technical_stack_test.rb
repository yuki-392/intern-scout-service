require "test_helper"

class TechnicalStackTest < ActiveSupport::TestCase
  test "normalizes unicode case and whitespace" do
    stack = TechnicalStack.create!(name: "  Ｒｕｂｙ   Ｏｎ   Ｒａｉｌｓ  ")

    assert_equal "ruby on rails", stack.normalized_name
  end

  test "normalized name is unique" do
    TechnicalStack.create!(name: "Ruby")
    duplicate = TechnicalStack.new(name: " ＲＵＢＹ ")

    assert_not duplicate.save
    assert duplicate.errors.of_kind?(:normalized_name, :taken)
  end

  test "name is required and at most fifty characters" do
    assert_not TechnicalStack.new(name: " ").valid?

    stack = TechnicalStack.new(name: "a" * 51)
    assert_not stack.valid?
    assert stack.errors.of_kind?(:name, :too_long)
  end
end
