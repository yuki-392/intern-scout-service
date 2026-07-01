class Application < ApplicationRecord
  belongs_to :job_posting
  belongs_to :intern_user, class_name: "User", inverse_of: :applications
  belongs_to :conversation
  belongs_to :message
  validates :intern_user_id, uniqueness: { scope: :job_posting_id }
  validate :consistent_relations

  private

  def consistent_relations
    errors.add(:intern_user, :invalid) unless intern_user&.role == "intern"
    errors.add(:conversation, :invalid) unless conversation&.intern_user_id == intern_user_id && conversation&.company_user_id == job_posting&.company&.user_id
    errors.add(:message, :invalid) unless message&.conversation_id == conversation_id && message&.sender_id == intern_user_id && message&.kind == "application"
  end
end
