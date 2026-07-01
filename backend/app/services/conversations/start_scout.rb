module Conversations
  class StartScout
    attr_reader :conversation, :message, :errors

    def initialize(company_user:, intern_profile:, body:)
      @company_user = company_user
      @intern_profile = intern_profile
      @body = body
      @errors = []
    end

    def call
      normalized_body = @body.to_s.strip
      unless normalized_body.length.between?(1, 2_000)
        @errors = [ { code: "validation_error", field: "body", message: "本文は1文字以上2,000文字以下で入力してください" } ]
        return false
      end
      ActiveRecord::Base.transaction do
        @conversation = Conversation.find_or_create_by!(company_user: @company_user, intern_user: @intern_profile.user) { |item| item.last_messaged_at = Time.current }
        @message = @conversation.messages.create!(sender: @company_user, body: normalized_body, kind: "scout")
      end
      true
    rescue ActiveRecord::RecordInvalid => error
      @errors = error.record.errors.map { |item| { code: "validation_error", field: item.attribute.to_s, message: item.full_message } }
      false
    end
  end
end
