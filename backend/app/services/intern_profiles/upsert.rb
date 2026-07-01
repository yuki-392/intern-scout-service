module InternProfiles
  class Upsert
    attr_reader :errors, :profile

    def initialize(user:, attributes:, stack_names:)
      @user = user
      @attributes = attributes
      @stack_names = stack_names || []
      @errors = []
    end

    def call
      @profile = @user.intern_profile || @user.build_intern_profile
      @profile.assign_attributes(@attributes)
      validate_stacks
      collect_profile_errors unless @profile.valid?
      return false if errors.any?

      ActiveRecord::Base.transaction do
        @profile.save!
        @profile.intern_profile_technical_stacks.delete_all
        @stack_names.each_with_index do |name, position|
          normalized = TechnicalStack.normalize_name(name)
          stack = TechnicalStack.find_or_create_by!(normalized_name: normalized) { |item| item.name = name }
          @profile.intern_profile_technical_stacks.create!(technical_stack: stack, position:)
        end
      end
      true
    end

    private

    def validate_stacks
      if @stack_names.length > 20
        add_error("technical_stacks", "技術スタックは20件以内で入力してください")
      end
      normalized = @stack_names.map { |name| TechnicalStack.normalize_name(name) }
      add_error("technical_stacks", "同じ技術スタックは追加できません") if normalized.uniq.length != normalized.length
      @stack_names.each_with_index do |name, index|
        add_error("technical_stacks.#{index}", "技術スタックを入力してください") if name.to_s.strip.blank?
        add_error("technical_stacks.#{index}", "技術スタックは50文字以内で入力してください") if name.to_s.length > 50
      end
    end

    def collect_profile_errors
      @profile.errors.each { |error| add_error(error.attribute.to_s, error.full_message) }
    end

    def add_error(field, message)
      @errors << { code: "validation_error", field:, message: }
    end
  end
end
