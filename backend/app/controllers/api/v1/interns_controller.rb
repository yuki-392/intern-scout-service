module Api
  module V1
    class InternsController < ApplicationController
      include Authentication
      before_action :authenticate_user!
      before_action :require_company!

      def index
        search = InternProfiles::Search.new(search_params)
        return render json: { errors: search.errors }, status: :unprocessable_entity unless search.valid?

        profiles = search.results
        response.headers["Cache-Control"] = "no-store"
        render json: {
          data: profiles.map { |profile| InternProfileListSerializer.new(profile).as_json },
          meta: { current_page: search.page, total_pages: search.total_pages, total_count: search.total_count, per_page: 20 }
        }
      end

      def show
        profile = InternProfile.joins(:user).where(users: { deleted_at: nil })
          .includes(intern_profile_technical_stacks: :technical_stack).find_by(id: params[:id])
        return render_not_found unless profile

        response.headers["Cache-Control"] = "no-store"
        render json: { data: InternProfileDetailSerializer.new(profile).as_json }
      end

      private

      def search_params
        params.permit(:school_name, :desired_role, :technical_stack, :page)
      end

      def require_company!
        return if current_user&.role == "company"
        render json: { errors: [ { code: "role_not_allowed", message: "利用できない機能です" } ] }, status: :forbidden
      end

      def render_not_found
        render json: { errors: [ { code: "not_found", message: "プロフィールが見つかりません" } ] }, status: :not_found
      end
    end
  end
end
