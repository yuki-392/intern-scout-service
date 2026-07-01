class InternProfileSerializer
  def initialize(profile)
    @profile = profile
  end

  def as_json(*)
    {
      id: @profile.id,
      display_name: @profile.display_name,
      school_name: @profile.school_name,
      grade: @profile.grade,
      bio: @profile.bio,
      desired_role: @profile.desired_role,
      technical_stacks: @profile.intern_profile_technical_stacks.includes(:technical_stack).map { |item| item.technical_stack.name },
      published: @profile.published_at.present?,
      published_at: @profile.published_at&.iso8601
    }
  end
end
