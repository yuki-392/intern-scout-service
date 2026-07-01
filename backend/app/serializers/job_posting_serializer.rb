class JobPostingSerializer
  def initialize(posting, viewer: nil)
    @posting = posting; @viewer = viewer
  end
  def as_json(*)
    { id: @posting.id, company_name: @posting.company.name, title: @posting.title,
      description: @posting.description, work_conditions: @posting.work_conditions,
      status: @posting.status, technical_stacks: @posting.job_posting_technical_stacks.map { |item| item.technical_stack.name },
      published_at: @posting.published_at&.iso8601,
      applied: @viewer&.role == "intern" ? Application.exists?(job_posting: @posting, intern_user: @viewer) : nil }
  end
end
