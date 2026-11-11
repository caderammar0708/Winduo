<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class MessageReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Message $message,
        public Conversation $conversation
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $sender = $this->message->sender;
        $senderName = $sender?->name ?? 'Someone';

        // Direct link based on recipient's role
        $link = match ($notifiable->role) {
            'admin' => "/admin/users?message_user_id={$this->message->sender_id}",
            'instructor' => "/instructor/messages/{$this->conversation->id}",
            'school' => "/school/messages/{$this->conversation->id}",
            default => "/client/messages/{$this->conversation->id}",
        };

        return [
            'type' => 'message',
            'title' => "{$senderName} sent you a message",
            'message' => Str::limit($this->message->body, 80),
            'link' => $link,
            'conversation_id' => $this->conversation->id,
            'sender_id' => $this->message->sender_id,
        ];
    }
}
