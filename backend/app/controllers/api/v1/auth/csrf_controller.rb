module Api
  module V1
    module Auth
      class CsrfController < ApplicationController
        def show
          response.headers["Cache-Control"] = "no-store"
          render json: { data: { csrf_token: form_authenticity_token } }
        end
      end
    end
  end
end
