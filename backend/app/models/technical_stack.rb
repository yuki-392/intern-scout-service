class TechnicalStack < ApplicationRecord
  has_many :intern_profile_technical_stacks, dependent: :destroy

  before_validation :normalize
  validates :name, presence: true, length: { maximum: 50 }
  validates :normalized_name, presence: true, uniqueness: true

  def self.normalize_name(value)
    value.to_s.unicode_normalize(:nfkc).strip.gsub(/\s+/, " ").downcase
  end

  private

  def normalize
    self.name = name.to_s.unicode_normalize(:nfkc).strip.gsub(/\s+/, " ")
    self.normalized_name = self.class.normalize_name(name)
  end
end
