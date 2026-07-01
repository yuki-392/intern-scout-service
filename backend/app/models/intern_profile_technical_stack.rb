class InternProfileTechnicalStack < ApplicationRecord
  belongs_to :intern_profile
  belongs_to :technical_stack

  validates :technical_stack_id, uniqueness: { scope: :intern_profile_id }
  validates :position, inclusion: { in: 0..19 }, uniqueness: { scope: :intern_profile_id }
end
