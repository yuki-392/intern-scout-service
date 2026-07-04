class InternProfileDetailSerializer
  def initialize(profile, conversation_id: nil)
    @profile = profile
    @conversation_id = conversation_id
  end

  def as_json(*)
    {
      id: @profile.id, display_name: @profile.display_name, school_name: @profile.school_name,
      grade: @profile.grade, bio: @profile.bio, desired_role: @profile.desired_role,
      technical_stacks: @profile.intern_profile_technical_stacks.map { |item| item.technical_stack.name },
      published_at: @profile.published_at.iso8601,
      conversation_id: @conversation_id
    }
  end
end
