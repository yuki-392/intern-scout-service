Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"
      get "me", to: "me#show"
      namespace :me do
        resource :intern_profile, only: %i[show update]
        resource :account, only: :destroy
      end
      resources :interns, only: %i[index show]
      resources :conversations, only: %i[index show create] do
        resources :messages, only: :create
      end
      resources :job_postings, only: %i[index show] do
        resources :applications, only: :create
      end
      namespace :company do
        resources :job_postings, only: %i[index show create update]
      end

      namespace :auth do
        get "csrf", to: "csrf#show"
        post "registrations", to: "registrations#create"
        post "session", to: "sessions#create"
        delete "session", to: "sessions#destroy"
      end
    end
  end

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
