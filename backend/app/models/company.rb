require "uri"

class Company < ApplicationRecord
  belongs_to :user
  has_many :job_postings, dependent: :restrict_with_exception

  before_validation :normalize_name

  validates :name, presence: true, length: { maximum: 100 }
  validates :description, length: { maximum: 2_000 }, allow_nil: true
  validates :website_url, length: { maximum: 2_048 }, allow_nil: true
  validates :user_id, uniqueness: true
  validate :user_has_company_role
  validate :website_url_is_http

  private

  def normalize_name
    self.name = name.to_s.strip
    self.description = description.to_s.strip.presence
    self.website_url = website_url.to_s.strip.presence
  end

  def user_has_company_role
    return if user&.role == "company"

    errors.add(:user, :invalid)
  end

  def website_url_is_http
    return if website_url.blank?

    uri = URI.parse(website_url)
    errors.add(:website_url, :invalid) unless uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    errors.add(:website_url, :invalid)
  end
end
