module Applications
  class Create
    attr_reader :application, :errors
    def initialize(posting:, intern_user:)
      @posting = posting; @intern_user = intern_user; @errors = []
    end
    def call
      return duplicate if Application.exists?(job_posting: @posting, intern_user: @intern_user)
      ActiveRecord::Base.transaction do
        conversation = Conversation.find_or_create_by!(company_user: @posting.company.user, intern_user: @intern_user) { |item| item.last_messaged_at = Time.current }
        body = "募集『#{@posting.title}』に応募しました。プロフィールをご確認ください。"
        message = conversation.messages.create!(sender: @intern_user, body:, kind: "application")
        @application = Application.create!(job_posting: @posting, intern_user: @intern_user, conversation:, message:)
      end
      true
    rescue ActiveRecord::RecordNotUnique
      duplicate
    end
    private
    def duplicate
      @errors = [ { code: "already_applied", message: "この募集には応募済みです" } ]; false
    end
  end
end
