<?php

use App\Models\AdminAction;
use App\Models\Conversation;
use App\Models\Instructor;
use App\Models\Message;
use App\Models\School;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use Illuminate\Support\Facades\Notification;

test('guests and non-admins cannot access admin user management routes', function () {
    $this->get('/admin/users')->assertRedirect('/login');
    $this->post('/admin/users', [])->assertRedirect('/login');

    $client = User::factory()->create(['role' => 'client']);
    $this->actingAs($client);

    $this->get('/admin/users')->assertForbidden();
    $this->post('/admin/users', [])->assertForbidden();
    $this->put("/admin/users/{$client->id}", [])->assertForbidden();
    $this->patch("/admin/users/{$client->id}/role", ['role' => 'admin'])->assertForbidden();
    $this->post("/admin/users/{$client->id}/toggle-status")->assertForbidden();
    $this->delete("/admin/users/{$client->id}")->assertForbidden();
    $this->post("/admin/users/{$client->id}/message", ['body' => 'Hi'])->assertForbidden();
});

test('admin can view and filter users on the user management page', function () {
    $admin = User::factory()->create(['role' => 'admin', 'name' => 'Root Admin']);
    $instructor = User::factory()->create(['role' => 'instructor', 'name' => 'Coach Maya', 'is_suspended' => false]);
    $inactiveClient = User::factory()->create(['role' => 'client', 'name' => 'Suspended Sam', 'is_suspended' => true]);

    $this->actingAs($admin);

    $this->get('/admin/users')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('admin/Users')
            ->where('counts.total', 3)
            ->where('counts.active', 2)
            ->where('counts.inactive', 1)
        );

    $this->get('/admin/users?role=instructor&search=Maya')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('admin/Users')
            ->has('users.data', 1)
            ->where('users.data.0.id', $instructor->id)
        );

    $this->get('/admin/users?status=inactive')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('admin/Users')
            ->has('users.data', 1)
            ->where('users.data.0.id', $inactiveClient->id)
        );
});

test('admin can create a new user with role and linked profile', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin);

    $response = $this->post('/admin/users', [
        'name' => 'Elena Kite',
        'email' => 'elena@winduo.test',
        'phone' => '+34 600 111 222',
        'role' => 'instructor',
        'license_number' => 'IKO-9921',
        'location' => 'Tarifa, Spain',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
        'is_active' => true,
    ]);

    $response->assertSessionHas('success');

    $created = User::where('email', 'elena@winduo.test')->first();
    expect($created)->not->toBeNull()
        ->and($created->role)->toBe('instructor')
        ->and($created->is_suspended)->toBeFalse()
        ->and($created->email_verified_at)->not->toBeNull();

    $instructorProfile = Instructor::where('user_id', $created->id)->first();
    expect($instructorProfile)->not->toBeNull()
        ->and($instructorProfile->status)->toBe('approved')
        ->and($instructorProfile->license_number)->toBe('IKO-9921')
        ->and($instructorProfile->location)->toBe('Tarifa, Spain');

    expect(AdminAction::where('action', 'create_user')->where('target_id', $created->id)->exists())->toBeTrue();
});

test('admin can edit a user and assign roles including school profile sync', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create([
        'name' => 'Old Name',
        'email' => 'old@winduo.test',
        'role' => 'client',
    ]);

    $this->actingAs($admin);

    $this->put("/admin/users/{$user->id}", [
        'name' => 'New School Owner',
        'email' => 'owner@winduo.test',
        'phone' => '+1 555 222 3333',
        'role' => 'school',
        'school_name' => 'Ocean Breeze School',
        'location' => 'Maui, HI',
        'is_active' => true,
    ])->assertSessionHas('success');

    $user->refresh();
    expect($user->name)->toBe('New School Owner')
        ->and($user->email)->toBe('owner@winduo.test')
        ->and($user->role)->toBe('school');

    $school = School::where('user_id', $user->id)->first();
    expect($school)->not->toBeNull()
        ->and($school->name)->toBe('Ocean Breeze School')
        ->and($school->status)->toBe('approved');

    $this->patch("/admin/users/{$user->id}/role", ['role' => 'admin'])
        ->assertSessionHas('success');

    $user->refresh();
    $school->refresh();
    expect($user->role)->toBe('admin')
        ->and($school->is_active)->toBeFalse();
});

test('admin can inactivate, reactivate, and soft delete a user', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create([
        'role' => 'client',
        'password' => bcrypt('Secret123!'),
        'is_suspended' => false,
    ]);

    $this->actingAs($admin);

    $this->post("/admin/users/{$user->id}/toggle-status")
        ->assertSessionHas('success');

    $user->refresh();
    expect($user->is_suspended)->toBeTrue();

    $this->post("/admin/users/{$user->id}/toggle-status")
        ->assertSessionHas('success');

    $user->refresh();
    expect($user->is_suspended)->toBeFalse();

    $this->delete("/admin/users/{$user->id}")
        ->assertSessionHas('success');

    expect(User::find($user->id))->toBeNull()
        ->and(User::withTrashed()->find($user->id))->not->toBeNull();
});

test('admin cannot demote, inactivate, or delete their own account', function () {
    $admin = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);
    $this->actingAs($admin);

    $this->patch("/admin/users/{$admin->id}/role", ['role' => 'client'])
        ->assertSessionHas('error');
    $this->post("/admin/users/{$admin->id}/toggle-status")
        ->assertSessionHas('error');
    $this->delete("/admin/users/{$admin->id}")
        ->assertSessionHas('error');

    $admin->refresh();
    expect($admin->role)->toBe('admin')
        ->and($admin->is_suspended)->toBeFalse()
        ->and($admin->deleted_at)->toBeNull();
});

test('admin can send a direct in-app message to a user and fetch message history', function () {
    Notification::fake();

    $admin = User::factory()->create(['role' => 'admin', 'name' => 'Site Admin']);
    $client = User::factory()->create(['role' => 'client', 'name' => 'Rider Leo']);

    $this->actingAs($admin);

    $response = $this->postJson("/admin/users/{$client->id}/message", [
        'body' => 'Welcome to Winduo! Let us know if you need help.',
    ]);

    $response->assertSuccessful()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message.body', 'Welcome to Winduo! Let us know if you need help.');

    $conversation = Conversation::forUser($admin->id)->first();
    expect($conversation)->not->toBeNull();

    $message = Message::where('conversation_id', $conversation->id)->first();
    expect($message)->not->toBeNull()
        ->and($message->sender_id)->toBe($admin->id);

    Notification::assertSentTo($client, MessageReceivedNotification::class);

    $this->getJson("/admin/users/{$client->id}/messages")
        ->assertSuccessful()
        ->assertJsonPath('conversation_id', $conversation->id)
        ->assertJsonCount(1, 'messages');
});

