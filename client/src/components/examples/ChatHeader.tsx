import ChatHeader from '../ChatHeader'

export default function ChatHeaderExample() {
  return (
    <div className="w-96 bg-background border rounded-lg overflow-hidden">
      <ChatHeader
        contactName="Sarah Wilson"
        isOnline={true}
        onBack={() => console.log('Back clicked')}
        onCall={() => console.log('Call clicked')}
        onVideoCall={() => console.log('Video call clicked')}
        onViewContact={() => console.log('Contact info clicked')}
      />
      <div className="h-32 bg-muted/20 flex items-center justify-center">
        <p className="text-muted-foreground">Chat content would appear here</p>
      </div>
    </div>
  )
}