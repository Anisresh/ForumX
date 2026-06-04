import MessageBubble from '../MessageBubble'

export default function MessageBubbleExample() {
  return (
    <div className="w-96 bg-background p-4 space-y-2">
      <MessageBubble
        id="1"
        content="Hey! How are you doing today?"
        timestamp="2024-01-15T10:30:00Z"
        isOwn={false}
        senderName="Sarah"
        status="delivered"
      />
      
      <MessageBubble
        id="2"
        content="I'm doing great, thanks for asking! Working on an exciting new project."
        timestamp="2024-01-15T10:32:00Z"
        isOwn={true}
        status="read"
      />
      
      <MessageBubble
        id="3"
        content="That sounds awesome! What kind of project is it?"
        timestamp="2024-01-15T10:35:00Z"
        isOwn={false}
        senderName="Sarah"
        status="sent"
      />
      
      <MessageBubble
        id="4"
        content="It's a real-time chat application, just like WhatsApp!"
        timestamp="2024-01-15T10:36:00Z"
        isOwn={true}
        status="sending"
      />
    </div>
  )
}