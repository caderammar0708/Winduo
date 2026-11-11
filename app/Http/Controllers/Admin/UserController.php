<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAction;
use App\Models\Conversation;
use App\Models\Instructor;
use App\Models\Message;
use App\Models\School;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of all users for admin management.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $role = (string) $request->input('role', 'all');
        $status = (string) $request->input('status', 'all');

        $query = User::query()
            ->with([
                'instructor:id,user_id,status,license_number,location',
                'school:id,user_id,name,status,location',
            ])
            ->withCount('bookings');

        if (in_array($role, ['admin', 'instructor', 'school', 'client'], true)) {
            $query->where('role', $role);
        }

        if ($status === 'active') {
            $query->where('is_suspended', false);
        } elseif ($status === 'inactive') {
            $query->where('is_suspended', true);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate(12)->withQueryString();

        $initialMessageUser = null;
        if ($request->filled('message_user_id')) {
            $initialMessageUser = User::with([
                'instructor:id,user_id,status,license_number,location',
                'school:id,user_id,name,status,location',
            ])->find((int) $request->input('message_user_id'));
        }

        return Inertia::render('admin/Users', [
            'users' => $users,
            'initialMessageUser' => $initialMessageUser,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
            ],
            'counts' => [
                'total' => User::count(),
                'active' => User::where('is_suspended', false)->count(),
                'inactive' => User::where('is_suspended', true)->count(),
                'admins' => User::where('role', 'admin')->count(),
                'instructors' => User::where('role', 'instructor')->count(),
                'schools' => User::where('role', 'school')->count(),
                'clients' => User::where('role', 'client')->count(),
            ],
        ]);
    }

    /**
     * Store a newly created user account.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::in(['client', 'instructor', 'school', 'admin'])],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'is_active' => ['sometimes', 'boolean'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        $admin = $request->user();
        $isActive = $request->boolean('is_active', true);

        $user = DB::transaction(function () use ($validated, $isActive, $admin): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
                'password' => $validated['password'],
                'is_suspended' => ! $isActive,
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();

            $this->syncRoleProfile($user, $admin, $validated);

            return $user;
        });

        AdminAction::record(
            $admin,
            'create_user',
            $user,
            "Created user {$user->name} ({$user->role})",
            [
                'role' => $user->role,
                'is_suspended' => $user->is_suspended,
            ],
        );

        return back()->with('success', "User {$user->name} was created successfully.");
    }

    /**
     * Update an existing user's details, role, and active status.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::in(['client', 'instructor', 'school', 'admin'])],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'is_active' => ['sometimes', 'boolean'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        if ($user->id === $admin->id) {
            if ($validated['role'] !== 'admin') {
                return back()->with('error', 'You cannot remove your own admin role.');
            }
            if ($request->has('is_active') && ! $request->boolean('is_active')) {
                return back()->with('error', 'You cannot inactivate your own admin account.');
            }
        }

        $oldRole = $user->role;
        $wasSuspended = (bool) $user->is_suspended;
        $isActive = $request->has('is_active') ? $request->boolean('is_active') : ! $wasSuspended;

        DB::transaction(function () use ($user, $validated, $isActive, $admin, $oldRole): void {
            $updates = [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
                'is_suspended' => ! $isActive,
            ];

            if (! empty($validated['password'])) {
                $updates['password'] = $validated['password'];
            }

            $user->update($updates);

            if ($oldRole !== $validated['role']) {
                $this->deactivatePreviousRoleProfile($user, $oldRole);
            }

            $this->syncRoleProfile($user, $admin, $validated);
        });

        if ($user->is_suspended && ! $wasSuspended) {
            $this->terminateUserSessions($user);
        }

        AdminAction::record(
            $admin,
            'update_user',
            $user,
            "Updated user {$user->name} ({$user->role})",
            [
                'old_role' => $oldRole,
                'new_role' => $user->role,
                'is_suspended' => $user->is_suspended,
            ],
        );

        return back()->with('success', "User {$user->name} was updated successfully.");
    }

    /**
     * Assign or change a user's role.
     */
    public function assignRole(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'role' => ['required', Rule::in(['client', 'instructor', 'school', 'admin'])],
        ]);

        if ($user->id === $admin->id && $validated['role'] !== 'admin') {
            return back()->with('error', 'You cannot change your own admin role.');
        }

        $oldRole = $user->role;
        $newRole = $validated['role'];

        if ($oldRole === $newRole) {
            return back()->with('success', "{$user->name} already has the {$newRole} role.");
        }

        DB::transaction(function () use ($user, $oldRole, $newRole, $admin): void {
            $user->update(['role' => $newRole]);
            $this->deactivatePreviousRoleProfile($user, $oldRole);
            $this->syncRoleProfile($user, $admin, []);
        });

        AdminAction::record(
            $admin,
            'assign_role',
            $user,
            "Assigned role {$newRole} to {$user->name} (was {$oldRole})",
            [
                'old_role' => $oldRole,
                'new_role' => $newRole,
            ],
        );

        return back()->with('success', "{$user->name} is now assigned the {$newRole} role.");
    }

    /**
     * Activate or inactivate (suspend) a user account.
     */
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        if ($user->id === $admin->id) {
            return back()->with('error', 'You cannot inactivate your own admin account.');
        }

        $willSuspend = ! $user->is_suspended;

        DB::transaction(function () use ($user, $willSuspend): void {
            $user->is_suspended = $willSuspend;
            $user->save();

            if ($user->instructor) {
                $user->instructor->update([
                    'status' => $willSuspend ? 'suspended' : 'approved',
                    'is_active' => ! $willSuspend,
                ]);
            }

            if ($user->school) {
                $user->school->update([
                    'status' => $willSuspend ? 'suspended' : 'approved',
                    'is_active' => ! $willSuspend,
                ]);
            }
        });

        if ($willSuspend) {
            $this->terminateUserSessions($user);
        }

        AdminAction::record(
            $admin,
            $willSuspend ? 'suspend' : 'reactivate',
            $user,
            ($willSuspend ? 'Inactivated' : 'Activated')." user account {$user->name}",
        );

        $statusLabel = $willSuspend ? 'inactivated' : 'activated';

        return back()->with('success', "User {$user->name} has been {$statusLabel}.");
    }

    /**
     * Soft-delete a user account.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        if ($user->id === $admin->id) {
            return back()->with('error', 'You cannot delete your own admin account.');
        }

        $userName = $user->name;

        AdminAction::record($admin, 'delete_user', $user, "Deleted user account {$userName} ({$user->email})");

        DB::transaction(function () use ($user): void {
            $user->instructor?->delete();
            $user->school?->delete();
            $user->delete();
        });

        $this->terminateUserSessions($user);

        return back()->with('success', "User {$userName} was removed.");
    }

    /**
     * Fetch the direct conversation history between the current admin and the target user.
     */
    public function messages(Request $request, User $user): JsonResponse
    {
        $admin = $request->user();
        $conversation = $this->findConversationBetween($admin->id, $user->id);

        if (! $conversation) {
            return response()->json([
                'conversation_id' => null,
                'messages' => [],
            ]);
        }

        $conversation->messages()
            ->where('sender_id', '!=', $admin->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->with('sender:id,name,role,profile_picture')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn (Message $message): array => $this->formatMessage($message));

        return response()->json([
            'conversation_id' => $conversation->id,
            'messages' => $messages,
        ]);
    }

    /**
     * Send a direct in-app message from the admin to the specified user.
     */
    public function sendMessage(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $admin = $request->user();

        if ($user->id === $admin->id) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['message' => 'You cannot send a direct message to yourself.'], 422);
            }

            return back()->with('error', 'You cannot send a direct message to yourself.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $conversation = $this->findConversationBetween($admin->id, $user->id);

        if (! $conversation) {
            $conversation = Conversation::create([
                'participant_one_id' => $admin->id,
                'participant_two_id' => $user->id,
                'type' => $user->role === 'school' ? 'school' : 'client',
                'last_message_at' => now(),
            ]);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $admin->id,
            'body' => trim($validated['body']),
        ]);

        $conversation->update(['last_message_at' => now()]);

        $user->notify(new MessageReceivedNotification($message, $conversation));

        AdminAction::record(
            $admin,
            'message_user',
            $user,
            "Sent direct message to {$user->name}",
            ['conversation_id' => $conversation->id],
        );

        if ($request->wantsJson() || $request->ajax()) {
            $message->load('sender:id,name,role,profile_picture');

            return response()->json([
                'success' => true,
                'conversation_id' => $conversation->id,
                'message' => $this->formatMessage($message),
            ]);
        }

        return back()->with('success', "Direct message sent to {$user->name}.");
    }

    /**
     * Ensure role-specific Instructor or School records exist and reflect user status.
     *
     * @param  array<string, mixed>  $data
     */
    protected function syncRoleProfile(User $user, User $admin, array $data): void
    {
        if ($user->role === 'instructor') {
            $instructor = Instructor::withTrashed()->firstOrNew(['user_id' => $user->id]);
            if ($instructor->trashed()) {
                $instructor->restore();
            }

            $instructor->fill([
                'phone' => $user->phone ?? $instructor->phone,
                'license_number' => $data['license_number'] ?? $instructor->license_number,
                'location' => $data['location'] ?? $instructor->location,
                'is_freelance' => $instructor->exists ? $instructor->is_freelance : true,
                'status' => $user->is_suspended ? 'suspended' : 'approved',
                'is_active' => ! $user->is_suspended,
                'reviewed_by' => $instructor->reviewed_by ?? $admin->id,
                'reviewed_at' => $instructor->reviewed_at ?? now(),
            ]);
            $instructor->save();
        } elseif ($user->role === 'school') {
            $school = School::withTrashed()->firstOrNew(['user_id' => $user->id]);
            if ($school->trashed()) {
                $school->restore();
            }

            $schoolName = ! empty($data['school_name'])
                ? (string) $data['school_name']
                : ($school->name ?: $user->name);

            $school->fill([
                'name' => $schoolName,
                'slug' => $school->slug ?: Str::slug($schoolName).'-'.strtolower(Str::random(4)),
                'contact_name' => $school->contact_name ?: $user->name,
                'phone' => $user->phone ?? $school->phone,
                'location' => $data['location'] ?? $school->location,
                'status' => $user->is_suspended ? 'suspended' : 'approved',
                'is_active' => ! $user->is_suspended,
                'reviewed_by' => $school->reviewed_by ?? $admin->id,
                'reviewed_at' => $school->reviewed_at ?? now(),
            ]);
            $school->save();
        }
    }

    /**
     * Deactivate the profile associated with a previous role when reassigned.
     */
    protected function deactivatePreviousRoleProfile(User $user, string $oldRole): void
    {
        if ($oldRole === 'instructor' && $user->instructor) {
            $user->instructor->update(['is_active' => false]);
        }

        if ($oldRole === 'school' && $user->school) {
            $user->school->update(['is_active' => false]);
        }
    }

    /**
     * Find an existing conversation between two users regardless of participant order.
     */
    protected function findConversationBetween(int $firstUserId, int $secondUserId): ?Conversation
    {
        return Conversation::where(function ($q) use ($firstUserId, $secondUserId): void {
            $q->where('participant_one_id', $firstUserId)
                ->where('participant_two_id', $secondUserId);
        })->orWhere(function ($q) use ($firstUserId, $secondUserId): void {
            $q->where('participant_one_id', $secondUserId)
                ->where('participant_two_id', $firstUserId);
        })->first();
    }

    /**
     * Terminate active database sessions for an inactivated or deleted user.
     */
    protected function terminateUserSessions(User $user): void
    {
        if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }
    }

    /**
     * Format a message payload for the admin direct-message dialog.
     *
     * @return array<string, mixed>
     */
    protected function formatMessage(Message $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'body' => $message->body,
            'read_at' => $message->read_at?->toISOString(),
            'created_at' => $message->created_at?->toISOString() ?? now()->toISOString(),
            'sender' => $message->sender ? [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'role' => $message->sender->role,
                'profile_picture' => $message->sender->profile_picture,
            ] : null,
        ];
    }
}
