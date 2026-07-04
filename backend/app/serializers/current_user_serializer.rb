class CurrentUserSerializer
  def initialize(user)
    @user = user
  end

  def as_json(*)
    {
      id: @user.id,
      email: @user.email,
      role: @user.role,
      company: company_json
    }
  end

  private

  def company_json
    return unless @user.company

    {
      id: @user.company.id,
      name: @user.company.name,
      description: @user.company.description,
      website_url: @user.company.website_url
    }
  end
end
