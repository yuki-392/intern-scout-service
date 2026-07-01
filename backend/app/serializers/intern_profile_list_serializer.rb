class InternProfileListSerializer
  def initialize(profile) = @profile = profile

  def as_json(*)
    {
      id: @profile.id, display_name: @profile.display_name, school_name: @profile.school_name,
      grade: @profile.grade, bio_excerpt: @profile.bio.first(200), desired_role: @profile.desired_role,
      technical_stacks: stack_names, published_at: @profile.published_at.iso8601
    }
  end

  private

  def stack_names
    @profile.intern_profile_technical_stacks.map { |item| item.technical_stack.name }
  end
end
