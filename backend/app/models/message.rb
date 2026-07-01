class Message < ApplicationRecord
  belongs_to :conversation
  belongs_to :sender, class_name: "User", inverse_of: :sent_messages

  before_validation { self.body = body.to_s.strip }
  validates :body, presence: true, length: { maximum: 2_000 }
  validates :kind, inclusion: { in: %w[scout normal application] }
  validate :sender_participates
  after_create { conversation.update!(last_messaged_at: created_at) }

  private

  def sender_participates
    errors.add(:sender, :invalid) unless conversation&.participant?(sender)
  end
end
