class JobPostingSerializer
  def initialize(posting, applied: nil)
    @posting = posting; @applied = applied
  end
  def as_json(*)
    { id: @posting.id, company_name: @posting.company.name,
      company_description: @posting.company.description, company_website_url: @posting.company.website_url, title: @posting.title,
      description: @posting.description, work_conditions: @posting.work_conditions,
      status: @posting.status, technical_stacks: @posting.job_posting_technical_stacks.map { |item| item.technical_stack.name },
      published_at: @posting.published_at&.iso8601,
      applied: @applied }
  end
end
