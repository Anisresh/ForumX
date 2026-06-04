import ChatList from '../ChatList'

const mockContacts = [
  {
    id: "1",
    name: "Sarah Wilson",
    lastMessage: "Hey! How are you doing?",
    lastMessageTime: "2024-01-15T10:30:00Z",
    unreadCount: 3,
    isOnline: true,
    messageStatus: "delivered" as const,
  },
  {
    id: "2",
    name: "Mike Johnson",
    lastMessage: "Thanks for the help with the project!",
    lastMessageTime: "2024-01-14T18:45:00Z",
    messageStatus: "read" as const,
    isOnline: false,
  },
  {
    id: "3",
    name: "Lisa Chen",
    lastMessage: "See you tomorrow at the meeting",
    lastMessageTime: "2024-01-14T16:20:00Z",
    unreadCount: 1,
    messageStatus: "delivered" as const,
    isOnline: true,
  },
  {
    id: "4",
    name: "David Rodriguez",
    lastMessage: "Can you send me the report?",
    lastMessageTime: "2024-01-13T14:15:00Z",
    messageStatus: "sent" as const,
    isOnline: false,
  }
];

export default function ChatListExample() {
  return (
    <div className="w-80 h-96 bg-background border rounded-lg overflow-hidden">
      <ChatList
        contacts={mockContacts}
        selectedContactId="3"
        onContactSelect={(id) => console.log('Contact selected:', id)}
        onNewChat={() => console.log('New chat clicked')}
      />
    </div>
  )
}