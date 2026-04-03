'use client'

import { ChatInterface } from '@/components/chat/chat-interface'
import { useUserProfile } from '@/components/chat/chat-layout-shell'

export default function NewChatPage() {
  const profile = useUserProfile()

  return (
    <ChatInterface
      conversationId={null}
      userProfile={
        profile
          ? {
              displayName: profile.displayName,
              role: profile.role,
              isFirstLogin: profile.isFirstLogin,
            }
          : undefined
      }
    />
  )
}
