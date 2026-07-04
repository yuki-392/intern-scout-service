require "securerandom"

module Accounts
  class Delete
    def initialize(user:, password:)
      @user = user
      @password = password
    end

    def call
      User.transaction do
        user = User.lock.find(@user.id)
        return false unless user.authenticate(@password)

        anonymize_role_data(user)
        user.update!(
          email: "deleted-#{user.id}-#{SecureRandom.hex(16)}@deleted.invalid",
          password: SecureRandom.hex(32),
          deleted_at: Time.current,
          session_version: user.session_version + 1
        )
      end

      true
    end

    private

    def anonymize_role_data(user)
      if user.role == "intern"
        user.intern_profile&.destroy!
      else
        company = user.company
        company.job_postings.update_all(status: "draft", updated_at: Time.current)
        company.update!(name: "退会済み企業-#{company.id}")
      end
    end
  end
end
