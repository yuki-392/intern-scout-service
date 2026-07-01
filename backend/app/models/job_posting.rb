class JobPosting < ApplicationRecord
  belongs_to :company
  has_many :job_posting_technical_stacks, -> { order(:position) }, dependent: :destroy
  has_many :technical_stacks, through: :job_posting_technical_stacks
  has_many :applications, dependent: :restrict_with_exception

  before_validation :normalize_fields
  before_validation :set_published_at
  validates :title, presence: true, length: { maximum: 100 }
  validates :description, presence: true, length: { maximum: 2_000 }
  validates :work_conditions, presence: true, length: { maximum: 1_000 }
  validates :status, inclusion: { in: %w[draft published] }

  private

  def normalize_fields
    self.title = title.to_s.strip
    self.description = description.to_s.strip
    self.work_conditions = work_conditions.to_s.strip
  end

  def set_published_at
    self.published_at ||= Time.current if status == "published"
  end
end
