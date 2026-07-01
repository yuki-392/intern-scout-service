module Api
  module V1
    class MessagesController < ApplicationController
      include Authentication
      before_action :authenticate_user!

      def create
        conversation = Conversation.find_by(id: params[:conversation_id])
        return not_found unless conversation&.participant?(current_user)
        if conversation.closed?
          return render json: { errors: [ { code: "conversation_closed", message: "この会話には送信できません" } ] }, status: :unprocessable_entity
        end
        message = conversation.messages.new(sender: current_user, body: message_params[:body], kind: "normal")
        if message.save
          render json: { data: MessageSerializer.new(message, current_user).as_json }, status: :created
        else
          render json: { errors: message.errors.map { |error| { code: "validation_error", field: error.attribute.to_s, message: error.full_message } } }, status: :unprocessable_entity
        end
      end

      private

      def message_params = params.require(:message).permit(:body)
      def not_found = render json: { errors: [ { code: "not_found", message: "会話が見つかりません" } ] }, status: :not_found
    end
  end
end
