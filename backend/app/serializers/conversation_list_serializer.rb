class ConversationListSerializer
  def initialize(conversation, viewer)
    @conversation = conversation
    @viewer = viewer
  end

  def as_json(*)
    latest = @conversation.messages.max_by { |message| [ message.created_at, message.id ] }
    { id: @conversation.id, counterpart_name: counterpart_name,
      latest_message_excerpt: latest.body.first(200), latest_message_kind: latest.kind,
      latest_sender_name: MessageSerializer.new(latest, @viewer).as_json[:sender_name],
      last_messaged_at: @conversation.last_messaged_at.iso8601 }
  end

  private

  def counterpart_name
    counterpart = @conversation.counterpart_for(@viewer)
    return "退会済みユーザー" if counterpart.deleted_at.present?
    counterpart.role == "company" ? counterpart.company.name : counterpart.intern_profile.display_name
  end
end
