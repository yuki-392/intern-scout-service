require "test_helper"
require "yaml"

class GithubActionsCiTest < ActiveSupport::TestCase
  test "backend CI provides the password required when preparing a fresh database" do
    workflow = YAML.safe_load_file(Rails.root.parent.join(".github/workflows/ci.yml"))
    password = workflow.dig("jobs", "backend", "env", "DEMO_USER_PASSWORD")

    assert password.is_a?(String) && password.length >= 8,
      "backend CI must provide a test-only DEMO_USER_PASSWORD"
  end
end
