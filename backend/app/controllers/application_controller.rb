class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection

  protect_from_forgery with: :exception

  rescue_from ActionController::InvalidAuthenticityToken, with: :render_invalid_csrf

  private

  def render_invalid_csrf
    render json: {
      errors: [
        {
          code: "invalid_csrf_token",
          message: "CSRF tokenが正しくありません"
        }
      ]
    }, status: :unprocessable_entity
  end
end
