module Api
  module V1
    class MeController < ApplicationController
      include Authentication

      before_action :authenticate_user!

      def show
        response.headers["Cache-Control"] = "no-store"
        render json: { data: CurrentUserSerializer.new(current_user).as_json }
      end
    end
  end
end
