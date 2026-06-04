import LoginForm from '../LoginForm'

export default function LoginFormExample() {
  return (
    <div className="h-96 bg-muted/20 flex items-center justify-center">
      <div className="w-full max-w-md">
        <LoginForm
          onLogin={(username, displayName) => 
            console.log('Login:', { username, displayName })
          }
        />
      </div>
    </div>
  )
}