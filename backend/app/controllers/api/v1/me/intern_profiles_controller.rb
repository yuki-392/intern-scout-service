module Api
  module V1
    module Me
      class InternProfilesController < ApplicationController
        include Authentication
        before_action :authenticate_user!
        before_action :require_intern!

        def show
          response.headers["Cache-Control"] = "no-store"
          render json: { data: serialized(current_user.intern_profile) }
        end

        def update
          operation = InternProfiles::Upsert.new(
            user: current_user,
            attributes: profile_params.except(:technical_stacks),
            stack_names: profile_params[:technical_stacks]
          )
          if operation.call
            render json: { data: serialized(operation.profile) }
          else
            render json: { errors: operation.errors }, status: :unprocessable_entity
          end
        end

        private

        def profile_params
          params.require(:intern_profile).permit(
            :display_name, :school_name, :grade, :bio, :desired_role, technical_stacks: []
          )
        end

        def require_intern!
          return if current_user&.role == "intern"
          render json: { errors: [ { code: "role_not_allowed", message: "利用できない機能です" } ] }, status: :forbidden
        end

        def serialized(profile)
          profile && InternProfileSerializer.new(profile).as_json
        end
      end
    end
  end
end
