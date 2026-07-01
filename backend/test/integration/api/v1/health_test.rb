require "test_helper"

class ApiV1HealthTest < ActionDispatch::IntegrationTest
  test "returns API health status" do
    get "/api/v1/health"

    assert_response :success
    assert_equal({ "status" => "ok" }, response.parsed_body)
  end
end
