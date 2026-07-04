require "test_helper"
require "yaml"

class GithubActionsCiTest < ActiveSupport::TestCase
  test "backend CI provides the password required when preparing a fresh database" do
    repository_root = Pathname(ENV.fetch("REPOSITORY_ROOT", Rails.root.parent.to_s))
    workflow = YAML.safe_load_file(repository_root.join(".github/workflows/ci.yml"))
    password = workflow.dig("jobs", "backend", "env", "DEMO_USER_PASSWORD")

    assert password.is_a?(String) && password.length >= 8,
      "backend CI must provide a test-only DEMO_USER_PASSWORD"
  end
end
