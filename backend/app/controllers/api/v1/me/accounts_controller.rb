module Api
  module V1
    module Me
      class AccountsController < ApplicationController
        include Authentication

        before_action :authenticate_user!

        def destroy
          deleted = Accounts::Delete.new(user: current_user, password: account_params[:password]).call
          return render_invalid_password unless deleted

          reset_session
          head :no_content
        end

        private

        def account_params
          params.require(:account).permit(:password)
        end

        def render_invalid_password
          render json: {
            errors: [
              {
                code: "invalid_password",
                field: "password",
                message: "パスワードが正しくありません"
              }
            ]
          }, status: :unprocessable_entity
        end
      end
    end
  end
end
