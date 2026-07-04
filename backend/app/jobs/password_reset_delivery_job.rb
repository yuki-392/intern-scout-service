class PasswordResetDeliveryJob < ApplicationJob
  def perform(user_id)
    user = User.active.find_by(id: user_id)
    return unless user

    token = user.issue_password_reset_token!
    PasswordResetMailer.with(user:, token:).reset.deliver_now
  rescue StandardError => error
    Rails.logger.error("Password reset email delivery failed: #{error.class}")
  end
end
