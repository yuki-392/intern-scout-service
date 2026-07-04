require "set"

module Api
  module V1
    class JobPostingsController < ApplicationController
      include Authentication
      before_action :authenticate_user!
      before_action :require_intern!
      def index
        scope = public_scope.order(published_at: :desc, id: :desc)
        total = scope.count; page = [ params[:page].to_i, 1 ].max
        postings = scope.includes(:company, job_posting_technical_stacks: :technical_stack).offset((page - 1) * 20).limit(20)
        applied_ids = current_user.applications.where(job_posting_id: postings.map(&:id)).pluck(:job_posting_id).to_set
        render json: { data: postings.map { |item| serialize(item, applied: applied_ids.include?(item.id)) }, meta: { current_page: page, total_pages: total.zero? ? 0 : (total.to_f / 20).ceil, total_count: total, per_page: 20 } }
      end
      def show
        posting = public_scope.includes(:company, job_posting_technical_stacks: :technical_stack).find_by(id: params[:id])
        return not_found unless posting
        render json: { data: serialize(posting, applied: current_user.applications.exists?(job_posting_id: posting.id)) }
      end
      private
      def public_scope = JobPosting.joins(company: :user).where(status: "published", users: { deleted_at: nil })
      def serialize(posting, applied:) = JobPostingSerializer.new(posting, applied:).as_json
      def require_intern!
        return if current_user&.role == "intern"

        render json: { errors: [ { code: "role_not_allowed" } ] }, status: :forbidden
      end
      def not_found = render json: { errors: [ { code: "not_found" } ] }, status: :not_found
    end
  end
end
