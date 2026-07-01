class Company < ApplicationRecord
  belongs_to :user
  has_many :job_postings, dependent: :restrict_with_exception

  before_validation :normalize_name

  validates :name, presence: true, length: { maximum: 100 }
  validates :user_id, uniqueness: true
  validate :user_has_company_role

  private

  def normalize_name
    self.name = name.to_s.strip
  end

  def user_has_company_role
    return if user&.role == "company"

    errors.add(:user, :invalid)
  end
end
