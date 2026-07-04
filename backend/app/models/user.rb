require "digest"
require "securerandom"

class User < ApplicationRecord
  PASSWORD_RESET_TTL = 30.minutes
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

  def issue_password_reset_token!
    token = SecureRandom.urlsafe_base64(32)
    update!(reset_password_digest: self.class.password_reset_digest(token), reset_password_sent_at: Time.current)
    token
  end

  def valid_password_reset_token?(token)
    return false if reset_password_digest.blank? || reset_password_sent_at.blank?
    return false if reset_password_sent_at < PASSWORD_RESET_TTL.ago

    ActiveSupport::SecurityUtils.secure_compare(
      reset_password_digest,
      self.class.password_reset_digest(token.to_s)
    )
  end

  def consume_password_reset!(token:, password:, password_confirmation:)
    return false if password.blank?

    with_lock do
      return false unless valid_password_reset_token?(token)

      self.password = password
      self.password_confirmation = password_confirmation
      self.reset_password_digest = nil
      self.reset_password_sent_at = nil
      self.session_version += 1
      save
    end
  end

  def self.password_reset_digest(token)
    Digest::SHA256.hexdigest(token)
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end

  def password_within_bcrypt_limit
    return if password.blank? || password.bytesize <= 72

    errors.add(:password, :too_long, count: 72)
  end
end
