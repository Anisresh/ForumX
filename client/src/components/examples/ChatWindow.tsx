import ChatWindow from '../ChatWindow'

const mockContact = {
  id: "1",
  name: "Sarah Wilson",
  isOnline: true,
  lastSeen: "2024-01-15T10:25:00Z",
};

const mockMessages = [
  {
    id: "1",
    content: "Hey! How are you doing today?",
    timestamp: "2024-01-15T10:30:00Z",
    isOwn: false,
    senderName: "Sarah",
    status: "delivered" as const,
  },
  {
    id: "2",
    content: "I'm doing great, thanks for asking! Working on an exciting new project.",
    timestamp: "2024-01-15T10:32:00Z",
    isOwn: true,
    status: "read" as const,
  },
  {
    id: "3",
    content: "That sounds awesome! What kind of project is it?",
    timestamp: "2024-01-15T10:35:00Z",
    isOwn: false,
    senderName: "Sarah",
    status: "sent" as const,
  },
  {
    id: "4",
    content: "It's a real-time chat application, just like WhatsApp! It has all the features like message bubbles, online status, and typing indicators.",
    timestamp: "2024-01-15T10:36:00Z",
    isOwn: true,
    status: "sending" as const,
  },
];

export default function ChatWindowExample() {
  return (
    <div className="w-full max-w-md h-96 bg-background border rounded-lg overflow-hidden">
      <ChatWindow
        contact={mockContact}
        messages={mockMessages}
        onSendMessage={(message) => console.log('Message sent:', message)}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  )
}