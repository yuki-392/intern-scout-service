module Api
  module V1
    module Auth
      class SessionsController < ApplicationController
        include Authentication

        before_action :reject_authenticated_user!, only: :create
        before_action :authenticate_user!, only: :destroy

        def create
          throttle = LoginThrottle.for(request.remote_ip)
          return render_throttled(throttle) if throttle.blocked?

          user = User.active.find_by(email: normalized_email)

          if user&.authenticate(login_params[:password])
            throttle.clear!
            sign_in(user)
            render json: { data: CurrentUserSerializer.new(user).as_json }
          else
            throttle.record_failure!
            render_invalid_credentials
          end
        end

        def destroy
          current_user.increment!(:session_version)
          reset_session
          head :no_content
        end

        private

        def login_params
          params.require(:session).permit(:email, :password)
        end

        def normalized_email
          login_params[:email].to_s.strip.downcase
        end

        def render_invalid_credentials
          render json: {
            errors: [
              {
                code: "invalid_credentials",
                message: "メールアドレスまたはパスワードが正しくありません"
              }
            ]
          }, status: :unauthorized
        end

        def render_throttled(throttle)
          response.headers["Retry-After"] = throttle.retry_after.to_s
          render json: {
            errors: [
              {
                code: "too_many_login_attempts",
                message: "ログイン試行が多すぎます。時間をおいてもう一度お試しください"
              }
            ]
          }, status: :too_many_requests
        end
      end
    end
  end
end
