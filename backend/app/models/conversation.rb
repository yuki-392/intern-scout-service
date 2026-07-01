class Conversation < ApplicationRecord
  belongs_to :company_user, class_name: "User", inverse_of: :company_conversations
  belongs_to :intern_user, class_name: "User", inverse_of: :intern_conversations
  has_many :messages, dependent: :restrict_with_exception

  validates :intern_user_id, uniqueness: { scope: :company_user_id }
  validate :participant_roles

  def participant?(user) = company_user_id == user.id || intern_user_id == user.id
  def closed? = company_user.deleted_at.present? || intern_user.deleted_at.present?
  def counterpart_for(user) = user.id == company_user_id ? intern_user : company_user

  private

  def participant_roles
    errors.add(:company_user, :invalid) unless company_user&.role == "company"
    errors.add(:intern_user, :invalid) unless intern_user&.role == "intern"
  end
end
