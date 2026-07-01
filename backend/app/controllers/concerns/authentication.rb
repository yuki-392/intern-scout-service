module Authentication
  extend ActiveSupport::Concern

  private

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = User.active.find_by(id: session[:user_id])
    reset_session if session[:user_id].present? && @current_user.nil?
    @current_user
  end

  def authenticate_user!
    return if current_user

    render json: {
      errors: [
        {
          code: "unauthenticated",
          message: "ログインが必要です"
        }
      ]
    }, status: :unauthorized
  end

  def reject_authenticated_user!
    return unless current_user

    render json: {
      errors: [
        {
          code: "already_authenticated",
          message: "すでにログインしています"
        }
      ]
    }, status: :conflict
  end

  def sign_in(user)
    reset_session
    session[:user_id] = user.id
  end
end
