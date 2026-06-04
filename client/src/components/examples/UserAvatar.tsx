import UserAvatar from '../UserAvatar'

export default function UserAvatarExample() {
  return (
    <div className="flex items-center gap-4 p-4">
      <UserAvatar name="John Doe" size="sm" status="online" showStatus />
      <UserAvatar name="Sarah Wilson" size="md" status="away" showStatus />
      <UserAvatar name="Mike Johnson" size="lg" status="busy" showStatus />
      <UserAvatar name="Lisa Chen" size="md" status="offline" showStatus />
    </div>
  )
}