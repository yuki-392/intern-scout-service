class User < ApplicationRecord
  has_secure_password

  has_one :company, dependent: :destroy
  has_one :intern_profile, dependent: :destroy
  has_many :company_conversations, class_name: "Conversation", foreign_key: :company_user_id, inverse_of: :company_user
  has_many :intern_conversations, class_name: "Conversation", foreign_key: :intern_user_id, inverse_of: :intern_user
  has_many :sent_messages, class_name: "Message", foreign_key: :sender_id, inverse_of: :sender
  has_many :applications, foreign_key: :intern_user_id, inverse_of: :intern_user, dependent: :restrict_with_exception

  before_validation :normalize_email

  validates :email,
    presence: true,
    length: { maximum: 254 },
    format: { with: /\A[^@\s]+@[^@\s]+\z/ },
    uniqueness: { case_sensitive: false }
  validates :role, inclusion: { in: %w[intern company] }
  validates :password, length: { minimum: 8 }, if: -> { password.present? }
  validate :password_within_bcrypt_limit

  scope :active, -> { where(deleted_at: nil) }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end

  def password_within_bcrypt_limit
    return if password.blank? || password.bytesize <= 72

    errors.add(:password, :too_long, count: 72)
  end
end
