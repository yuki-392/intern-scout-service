class PasswordResetMailer < ApplicationMailer
  def reset
    @user = params[:user]
    @reset_url = "#{frontend_origin}/reset-password#token=#{CGI.escape(params[:token])}"
    mail(to: @user.email, subject: "パスワード再設定のご案内")
  end

  private

  def frontend_origin
    ENV.fetch("FRONTEND_ORIGIN", "http://localhost:3000").delete_suffix("/")
  end
end
