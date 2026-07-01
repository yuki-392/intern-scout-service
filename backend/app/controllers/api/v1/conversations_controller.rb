module Api
  module V1
    class ConversationsController < ApplicationController
      include Authentication
      before_action :authenticate_user!

      def create
        return role_forbidden unless current_user.role == "company"
        profile = InternProfile.joins(:user).where(users: { deleted_at: nil }).find_by(id: create_params[:intern_profile_id])
        return not_found unless profile
        operation = Conversations::StartScout.new(company_user: current_user, intern_profile: profile, body: create_params[:body])
        return render json: { errors: operation.errors }, status: :unprocessable_entity unless operation.call
        render json: { data: { conversation_id: operation.conversation.id, message: MessageSerializer.new(operation.message, current_user).as_json } }, status: :created
      end

      def index
        page = valid_page
        return unless page
        scope = Conversation.where("company_user_id = :id OR intern_user_id = :id", id: current_user.id)
        total = scope.count
        conversations = scope.includes(:company_user, :intern_user, messages: :sender).order(last_messaged_at: :desc, id: :desc).offset((page - 1) * 20).limit(20)
        render json: { data: conversations.map { |item| ConversationListSerializer.new(item, current_user).as_json }, meta: meta(page, total, 20) }
      end

      def show
        conversation = own_conversation
        return not_found unless conversation
        page = valid_page
        return unless page
        total = conversation.messages.count
        selected = conversation.messages.includes(sender: %i[company intern_profile]).order(created_at: :desc, id: :desc).offset((page - 1) * 50).limit(50).to_a.reverse
        render json: { data: { id: conversation.id, counterpart_name: counterpart_name(conversation), can_send: !conversation.closed?, messages: selected.map { |item| MessageSerializer.new(item, current_user).as_json }, meta: meta(page, total, 50) } }
      end

      private

      def create_params = params.require(:conversation).permit(:intern_profile_id, :body)
      def own_conversation = Conversation.includes(company_user: :company, intern_user: :intern_profile).find_by(id: params[:id])&.then { |item| item if item.participant?(current_user) }
      def valid_page
        raw = params[:page].presence || "1"
        return raw.to_i if raw.to_s.match?(/\A[1-9]\d*\z/)
        render json: { errors: [ { code: "validation_error", field: "page", message: "ページ番号が正しくありません" } ] }, status: :unprocessable_entity
        nil
      end
      def meta(page, total, per_page) = { current_page: page, total_pages: total.zero? ? 0 : (total.to_f / per_page).ceil, total_count: total, per_page: }
      def counterpart_name(conversation)
        user = conversation.counterpart_for(current_user)
        return "退会済みユーザー" if user.deleted_at.present?
        user.role == "company" ? user.company.name : user.intern_profile.display_name
      end
      def not_found = render json: { errors: [ { code: "not_found", message: "会話が見つかりません" } ] }, status: :not_found
      def role_forbidden = render json: { errors: [ { code: "role_not_allowed", message: "利用できない機能です" } ] }, status: :forbidden
    end
  end
end
