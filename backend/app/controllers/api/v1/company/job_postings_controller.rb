module Api
  module V1
    module Company
      class JobPostingsController < ApplicationController
        include Authentication
        before_action :authenticate_user!
        before_action :require_company!
        def index
          scope = current_user.company.job_postings.order(updated_at: :desc, id: :desc)
          total = scope.count; page = [ params[:page].to_i, 1 ].max
          postings = scope.includes(job_posting_technical_stacks: :technical_stack).offset((page - 1) * 20).limit(20)
          render json: { data: postings.map { |item| serialize(item) }, meta: pagination_meta(page, total, 20) }
        end
        def show
          posting = owned; return not_found unless posting
          render json: { data: serialize(posting) }
        end
        def create
          posting = current_user.company.job_postings.new
          save(posting, :created)
        end
        def update
          posting = owned; return not_found unless posting
          save(posting, :ok)
        end
        private
        def save(posting, status)
          operation = JobPostings::Upsert.new(posting:, attributes: permitted.except(:technical_stacks), stack_names: permitted[:technical_stacks])
          operation.call ? render(json: { data: serialize(posting) }, status:) : render(json: { errors: operation.errors }, status: :unprocessable_entity)
        end
        def permitted = params.require(:job_posting).permit(:title, :description, :work_conditions, :status, technical_stacks: [])
        def owned = current_user.company.job_postings.includes(job_posting_technical_stacks: :technical_stack).find_by(id: params[:id])
        def serialize(posting) = JobPostingSerializer.new(posting).as_json
        def pagination_meta(page, total, per_page)
          { current_page: page, total_pages: total.zero? ? 0 : (total.to_f / per_page).ceil, total_count: total, per_page: }
        end
        def require_company!
          return if current_user&.role == "company"

          render json: { errors: [ { code: "role_not_allowed" } ] }, status: :forbidden
        end
        def not_found = render json: { errors: [ { code: "not_found" } ] }, status: :not_found
      end
    end
  end
end
