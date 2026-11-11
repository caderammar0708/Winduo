<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminAction extends AuditLog
{
    use HasFactory;

    protected $table = 'audit_logs';

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Record an audit action performed by an admin.
     */
    public static function record(
        User $admin,
        string $action,
        Model $target,
        ?string $details = null,
        ?array $meta = []
    ): self {
        $name = null;
        if (isset($target->name)) {
            $name = $target->name;
        } elseif (isset($target->user) && isset($target->user->name)) {
            $name = $target->user->name;
        } elseif (isset($target->id)) {
            $name = '#'.$target->id;
        }

        $eventMap = [
            'approve' => 'approved',
            'reject' => 'rejected',
            'suspend' => 'suspended',
            'reactivate' => 'reactivated',
            'delete' => 'deleted',
            'delete_user' => 'deleted',
            'create_user' => 'created',
            'update_user' => 'updated',
            'assign_role' => 'updated',
            'message_user' => 'messaged',
            'cancel_booking' => 'cancelled',
            'update_settings' => 'settings_changed',
            'request_info' => 'request_info',
            'hide_review' => 'hidden',
            'delete_review' => 'deleted',
        ];
        $event = $eventMap[$action] ?? $action;

        $description = $details ?: "Admin {$action} ".class_basename($target).($name ? " {$name}" : '');

        try {
            $req = request();
            $metaData = array_merge(['summary' => $details], $meta ?? []);

            /** @var self $created */
            $created = self::create([
                'user_id' => $admin->id,
                'user_name' => $admin->name,
                'user_role' => $admin->role ?? 'admin',
                'event' => $event,
                'auditable_type' => get_class($target),
                'auditable_id' => $target->getKey(),
                'description' => $description,
                'new_values' => $metaData,
                'ip_address' => $req?->ip() ?? '127.0.0.1',
                'user_agent' => $req?->userAgent(),
                'url' => $req?->fullUrl(),
                'method' => $req?->method() ?? 'POST',
                // Legacy columns
                'admin_id' => $admin->id,
                'action' => $action,
                'target_type' => class_basename($target),
                'target_id' => $target->getKey(),
                'target_name' => $name,
                'details' => $metaData,
            ]);

            return $created;
        } catch (\Throwable $e) {
            report($e);

            return new self;
        }
    }
}
