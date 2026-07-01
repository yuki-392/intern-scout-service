class MessageSerializer
  def initialize(message, viewer)
    @message = message
    @viewer = viewer
  end

  def as_json(*)
    { id: @message.id, sender_name: sender_name, body: @message.body, kind: @message.kind,
      created_at: @message.created_at.iso8601, mine: @message.sender_id == @viewer.id }
  end

  private

  def sender_name
    return "退会済みユーザー" if @message.sender.deleted_at.present?
    @message.sender.role == "company" ? @message.sender.company.name : @message.sender.intern_profile.display_name
  end
end
