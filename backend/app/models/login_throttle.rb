require "openssl"

class LoginThrottle < ApplicationRecord
  LIMIT = 5
  WINDOW = 15.minutes

  def self.for(ip_address, scope: "login")
    digest = OpenSSL::HMAC.hexdigest(
      "SHA256",
      Rails.application.secret_key_base,
      "#{scope}\0#{ip_address}"
    )
    find_or_create_by!(key_digest: digest) { |record| record.window_started_at = Time.current }
  rescue ActiveRecord::RecordNotUnique
    retry
  end

  def blocked?
    blocked_until.present? && blocked_until.future?
  end

  def retry_after
    return 0 unless blocked?

    (blocked_until - Time.current).ceil
  end

  def record_failure!
    with_lock do
      if window_started_at < WINDOW.ago
        self.failure_count = 0
        self.window_started_at = Time.current
        self.blocked_until = nil
      end

      self.failure_count += 1
      self.blocked_until = WINDOW.from_now if failure_count >= LIMIT
      save!
    end
  end

  def clear!
    destroy!
  end
end
