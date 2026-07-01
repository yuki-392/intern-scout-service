module Api
  module V1
    class ApplicationsController < ApplicationController
      include Authentication
      before_action :authenticate_user!
      def create
        return render(json: { errors: [ { code: "role_not_allowed" } ] }, status: :forbidden) unless current_user.role == "intern"
        posting = JobPosting.joins(company: :user).where(status: "published", users: { deleted_at: nil }).find_by(id: params[:job_posting_id])
        return render(json: { errors: [ { code: "not_found" } ] }, status: :not_found) unless posting
        operation = Applications::Create.new(posting:, intern_user: current_user)
        unless operation.call
          return render json: { errors: operation.errors }, status: :conflict
        end
        record = operation.application
        render json: { data: { id: record.id, conversation_id: record.conversation_id, message: MessageSerializer.new(record.message, current_user).as_json } }, status: :created
      end
    end
  end
end
