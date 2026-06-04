import MessageInput from '../MessageInput'

export default function MessageInputExample() {
  const handleSendMessage = (message: string) => {
    console.log('Message sent:', message);
  };

  return (
    <div className="w-96 bg-background border rounded-lg overflow-hidden">
      <div className="h-40 bg-muted/20 flex items-center justify-center">
        <p className="text-muted-foreground">Chat messages would appear here</p>
      </div>
      <MessageInput 
        onSendMessage={handleSendMessage}
        placeholder="Type your message..."
      />
    </div>
  )
}