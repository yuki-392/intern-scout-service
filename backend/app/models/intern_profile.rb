class InternProfile < ApplicationRecord
  GRADES = [ "1年", "2年", "3年", "4年", "5年", "修士1年", "修士2年", "博士課程", "その他" ].freeze

  belongs_to :user
  has_many :intern_profile_technical_stacks, -> { order(:position) }, dependent: :destroy
  has_many :technical_stacks, through: :intern_profile_technical_stacks

  before_validation :normalize_fields
  before_validation :set_publication_time, on: :create

  validates :user_id, uniqueness: true
  validates :display_name, presence: true, length: { maximum: 50 }
  validates :school_name, presence: true, length: { maximum: 100 }
  validates :grade, inclusion: { in: GRADES }
  validates :bio, presence: true, length: { maximum: 1_000 }
  validates :desired_role, length: { maximum: 100 }, allow_nil: true
  validate :user_is_intern

  private

  def normalize_fields
    self.display_name = display_name.to_s.strip
    self.school_name = school_name.to_s.strip
    self.bio = bio.to_s.strip
    self.desired_role = desired_role.to_s.strip.presence
  end

  def set_publication_time
    self.published_at ||= Time.current
  end

  def user_is_intern
    errors.add(:user, :invalid) unless user&.role == "intern"
  end
end
