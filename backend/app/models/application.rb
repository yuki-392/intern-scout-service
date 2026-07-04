class Application < ApplicationRecord
  belongs_to :job_posting
  belongs_to :company
  belongs_to :intern_user, class_name: "User", inverse_of: :applications
  belongs_to :conversation
  belongs_to :message
  validates :intern_user_id, uniqueness: { scope: :company_id }
  before_validation :set_company
  validate :consistent_relations

  private

  def set_company
    self.company ||= job_posting&.company
  end

  def consistent_relations
    errors.add(:intern_user, :invalid) unless intern_user&.role == "intern"
    errors.add(:company, :invalid) unless company_id == job_posting&.company_id
    errors.add(:conversation, :invalid) unless conversation&.intern_user_id == intern_user_id && conversation&.company_user_id == job_posting&.company&.user_id
    errors.add(:message, :invalid) unless message&.conversation_id == conversation_id && message&.sender_id == intern_user_id && message&.kind == "application"
  end
end
