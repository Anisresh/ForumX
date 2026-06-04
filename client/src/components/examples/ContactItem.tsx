import ContactItem from '../ContactItem'

export default function ContactItemExample() {
  return (
    <div className="w-80 bg-card border rounded-lg p-2 space-y-1">
      <ContactItem
        id="1"
        name="Sarah Wilson"
        lastMessage="Hey! How are you doing?"
        lastMessageTime="2024-01-15T10:30:00Z"
        unreadCount={3}
        isOnline={true}
        onClick={() => console.log('Contact clicked: Sarah Wilson')}
      />
      <ContactItem
        id="2"
        name="Mike Johnson"
        lastMessage="Thanks for the help with the project!"
        lastMessageTime="2024-01-14T18:45:00Z"
        messageStatus="read"
        isOnline={false}
        onClick={() => console.log('Contact clicked: Mike Johnson')}
      />
      <ContactItem
        id="3"
        name="Lisa Chen"
        lastMessage="See you tomorrow at the meeting"
        lastMessageTime="2024-01-14T16:20:00Z"
        unreadCount={1}
        messageStatus="delivered"
        isOnline={true}
        isActive={true}
        onClick={() => console.log('Contact clicked: Lisa Chen')}
      />
    </div>
  )
}