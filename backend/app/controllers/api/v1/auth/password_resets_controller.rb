module Api
  module V1
    module Auth
      class PasswordResetsController < ApplicationController
        def create
          throttle = LoginThrottle.for(request.remote_ip, scope: "password_reset")
          return render_throttled(throttle) if throttle.blocked?

          throttle.record_failure!
          user = User.active.find_by(email: normalized_email)
          PasswordResetDeliveryJob.perform_later(user.id) if user

          render json: { data: { message: "該当するアカウントがある場合、再設定メールを送信しました" } }, status: :accepted
        end

        def update
          digest = User.password_reset_digest(reset_params[:token].to_s)
          user = User.active.find_by(reset_password_digest: digest)

          if user&.consume_password_reset!(
            token: reset_params[:token],
            password: reset_params[:password],
            password_confirmation: reset_params[:password_confirmation]
          )
            head :no_content
          else
            render_invalid_reset
          end
        end

        private

        def normalized_email
          params[:email].to_s.strip.downcase
        end

        def reset_params
          params.permit(:token, :password, :password_confirmation)
        end

        def render_invalid_reset
          render json: {
            errors: [
              {
                code: "invalid_password_reset",
                message: "再設定リンクが無効か期限切れです。もう一度お手続きください"
              }
            ]
          }, status: :unprocessable_entity
        end

        def render_throttled(throttle)
          response.headers["Retry-After"] = throttle.retry_after.to_s
          render json: {
            errors: [
              {
                code: "too_many_password_reset_requests",
                message: "再設定のリクエストが多すぎます。時間をおいてもう一度お試しください"
              }
            ]
          }, status: :too_many_requests
        end
      end
    end
  end
end
