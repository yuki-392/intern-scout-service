class JobPostingTechnicalStack < ApplicationRecord
  belongs_to :job_posting
  belongs_to :technical_stack
  validates :technical_stack_id, uniqueness: { scope: :job_posting_id }
  validates :position, inclusion: { in: 0..19 }, uniqueness: { scope: :job_posting_id }
end
