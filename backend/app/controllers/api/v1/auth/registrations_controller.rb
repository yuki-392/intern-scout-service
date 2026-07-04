module Api
  module V1
    module Auth
      class RegistrationsController < ApplicationController
        include Authentication

        before_action :reject_authenticated_user!

        def create
          return render_demo_email_required unless demo_email_allowed?

          user = User.new(user_attributes)
          company = ::Company.new(user:, name: registration_params[:company_name]) if user.role == "company"

          if valid_registration?(user, company)
            User.transaction do
              user.save!
              company&.save!
            end
            sign_in(user)
            render json: { data: CurrentUserSerializer.new(user).as_json }, status: :created
          else
            render_validation_errors(user, company)
          end
        rescue ActiveRecord::RecordNotUnique
          render json: {
            errors: [ validation_error("email", "メールアドレスはすでに使用されています") ]
          }, status: :unprocessable_entity
        end

        private

        def registration_params
          params.require(:user).permit(:email, :password, :password_confirmation, :company_name)
        end

        def user_attributes
          registration_params.except(:company_name).merge(role: requested_role)
        end

        def requested_role
          params.require(:user)[:role]
        end

        def valid_registration?(user, company)
          user_valid = user.valid?
          company_valid = company.nil? || company.valid?
          user_valid && company_valid
        end

        def render_validation_errors(user, company)
          errors = serialized_errors(user)
          errors.concat(serialized_errors(company, "company_name")) if company
          render json: { errors: }, status: :unprocessable_entity
        end

        def serialized_errors(record, field_override = nil)
          record.errors.map do |error|
            validation_error(field_override || error.attribute.to_s, error.full_message)
          end
        end

        def validation_error(field, message)
          {
            code: "validation_error",
            field:,
            message:
          }
        end

        def demo_email_allowed?
          ENV["DEMO_MODE"] != "true" || registration_params[:email].to_s.strip.downcase.end_with?(".example")
        end

        def render_demo_email_required
          render json: {
            errors: [
              {
                code: "demo_email_required",
                field: "email",
                message: "公開デモでは実在しない.exampleメールアドレスを使用してください"
              }
            ]
          }, status: :unprocessable_entity
        end
      end
    end
  end
end
