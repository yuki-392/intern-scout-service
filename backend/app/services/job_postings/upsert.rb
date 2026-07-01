module JobPostings
  class Upsert
    attr_reader :posting, :errors
    def initialize(posting:, attributes:, stack_names:)
      @posting = posting; @attributes = attributes; @stack_names = stack_names || []; @errors = []
    end
    def call
      posting.assign_attributes(@attributes)
      validate_stacks
      posting.errors.each { |error| add(error.attribute.to_s, error.full_message) } unless posting.valid?
      return false if errors.any?
      ActiveRecord::Base.transaction do
        posting.save!
        posting.job_posting_technical_stacks.delete_all
        @stack_names.each_with_index do |name, position|
          normalized = TechnicalStack.normalize_name(name)
          stack = TechnicalStack.find_or_create_by!(normalized_name: normalized) { |item| item.name = name }
          posting.job_posting_technical_stacks.create!(technical_stack: stack, position:)
        end
      end
      true
    end
    private
    def validate_stacks
      add("technical_stacks", "技術スタックは20件以内です") if @stack_names.length > 20
      normalized = @stack_names.map { |name| TechnicalStack.normalize_name(name) }
      add("technical_stacks", "同じ技術スタックは追加できません") if normalized.uniq.length != normalized.length
      @stack_names.each_with_index { |name, i| add("technical_stacks.#{i}", "技術スタックが正しくありません") unless name.to_s.strip.length.between?(1, 50) }
    end
    def add(field, message) = errors << { code: "validation_error", field:, message: }
  end
end
