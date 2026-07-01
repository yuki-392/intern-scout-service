module InternProfiles
  class Search
    PER_PAGE = 20
    LIMITS = { "school_name" => 100, "desired_role" => 100, "technical_stack" => 50 }.freeze

    attr_reader :errors, :page, :total_count

    def initialize(params)
      @params = params
      @errors = []
      validate
    end

    def valid? = errors.empty?

    def results
      scope = InternProfile.joins(:user).where(users: { deleted_at: nil })
      scope = filter(scope, :school_name, @params[:school_name])
      scope = filter(scope, :desired_role, @params[:desired_role])
      if @params[:technical_stack].to_s.strip.present?
        term = TechnicalStack.normalize_name(@params[:technical_stack])
        scope = scope.joins(:technical_stacks).where("technical_stacks.normalized_name ILIKE ?", pattern(term)).distinct
      end
      @total_count = scope.count
      scope.includes(intern_profile_technical_stacks: :technical_stack)
        .order(published_at: :desc, id: :desc).offset((page - 1) * PER_PAGE).limit(PER_PAGE)
    end

    def total_pages
      return 0 if total_count.to_i.zero?
      (total_count.to_f / PER_PAGE).ceil
    end

    private

    def validate
      raw_page = @params[:page].presence || "1"
      @page = raw_page.to_s.match?(/\A[1-9]\d*\z/) ? raw_page.to_i : 1
      add_error("page", "ページ番号が正しくありません") unless raw_page.to_s.match?(/\A[1-9]\d*\z/)
      LIMITS.each do |field, limit|
        add_error(field, "#{field}が長すぎます") if @params[field].to_s.length > limit
      end
    end

    def filter(scope, field, value)
      term = value.to_s.strip
      return scope if term.blank?

      column = InternProfile.arel_table[field]
      scope.where(column.matches(pattern(term), nil, false))
    end

    def pattern(value)
      "%#{ActiveRecord::Base.sanitize_sql_like(value)}%"
    end

    def add_error(field, message)
      errors << { code: "validation_error", field:, message: }
    end
  end
end
