<?php

use App\Http\Controllers\Admin\ApprovalController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\SchoolController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\VerificationPendingController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\Client\BookingController as ClientBookingController;
use App\Http\Controllers\Client\MessageController as ClientMessageController;
use App\Http\Controllers\Client\ReviewController as ClientReviewController;
use App\Http\Controllers\Client\SettingsController as ClientSettingsController;
use App\Http\Controllers\Instructor\AvailabilityController;
use App\Http\Controllers\Instructor\BookingController as InstructorBookingController;
use App\Http\Controllers\Instructor\BrowseInstructorController;
use App\Http\Controllers\Instructor\DashboardController as InstructorDashboardController;
use App\Http\Controllers\Instructor\HireRequestController;
use App\Http\Controllers\Instructor\MessageController;
use App\Http\Controllers\Instructor\NotificationController;
use App\Http\Controllers\Instructor\ProfileController as InstructorProfileController;
use App\Http\Controllers\Instructor\RevenueController;
use App\Http\Controllers\Instructor\ReviewController;
use App\Http\Controllers\Instructor\SettingsController as InstructorSettingsController;
use App\Http\Controllers\InstructorController;
use App\Http\Controllers\NotificationController as GlobalNotificationController;
use App\Http\Controllers\PublicSchoolController;
use App\Http\Controllers\School\InstructorRosterController;
use App\Http\Controllers\School\PackageController;
use App\Http\Controllers\School\ProfileController;
use App\Http\Controllers\School\SettingsController;
use App\Http\Controllers\WeatherController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/join', function () {
    return Inertia::render('join');
})->name('join');

// Public Weather API (Meteosource proxy with rate limiting)
Route::get('/api/weather', [WeatherController::class, 'getWeather'])->middleware('throttle:60,1')->name('api.weather');
Route::get('/api/weather/search-locations', [WeatherController::class, 'searchLocations'])->middleware('throttle:60,1')->name('api.weather.search');

// Public Instructor Discovery
Route::get('/instructors', [InstructorController::class, 'index'])->name('instructors.index');
Route::get('/instructors/{instructor}', [InstructorController::class, 'show'])->name('instructors.show');

// Public Kite Centers (Schools) Discovery
Route::get('/schools', [PublicSchoolController::class, 'index'])->name('schools.index');
Route::get('/schools/{school}', [PublicSchoolController::class, 'show'])->name('schools.show');
Route::get('/kite-centers', fn () => redirect()->route('schools.index'));

// Authenticated Routes
Route::middleware(['auth'])->group(function () {
    // Verification Pending Gate (standalone page for pending/rejected instructors & schools)
    Route::get('/verification-pending', [VerificationPendingController::class, 'show'])->name('verification.pending');
    Route::post('/verification-pending/resubmit', [VerificationPendingController::class, 'resubmit'])->name('verification.pending.resubmit');

    Route::get('dashboard', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        if ($user->role === 'instructor') {
            return redirect()->route('instructor.dashboard');
        }
        if ($user->role === 'school') {
            return redirect()->route('school.dashboard');
        }

        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::post('/bookings', [BookingController::class, 'store'])->name('bookings.store');

    // Client Dashboard & Features
    Route::get('/client/bookings', [ClientBookingController::class, 'index'])->name('client.bookings');
    Route::get('/bookings', fn () => redirect()->route('client.bookings'));

    Route::get('/client/messages', [ClientMessageController::class, 'index'])->name('client.messages');
    Route::post('/client/messages/start', [ClientMessageController::class, 'start'])->name('client.messages.start');
    Route::get('/client/messages/{conversation}', [ClientMessageController::class, 'show'])->whereNumber('conversation')->name('client.messages.show');
    Route::post('/client/messages/{conversation}', [ClientMessageController::class, 'store'])->whereNumber('conversation')->name('client.messages.store');

    Route::post('/client/reviews', [ClientReviewController::class, 'store'])->name('client.reviews.store');

    // Global Notifications
    Route::get('/notifications', [GlobalNotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [GlobalNotificationController::class, 'markAllAsRead'])->name('notifications.readAll');
    Route::post('/notifications/{id}/read', [GlobalNotificationController::class, 'markAsRead'])->name('notifications.read');

    // Client Settings
    Route::get('/client/settings', [ClientSettingsController::class, 'index'])->name('client.settings');
    Route::post('/client/settings/profile', [ClientSettingsController::class, 'updateProfile'])->name('client.settings.profile');
    Route::post('/client/settings/password', [ClientSettingsController::class, 'updatePassword'])->name('client.settings.password');
    Route::post('/client/settings/notifications', [ClientSettingsController::class, 'updateNotifications'])->name('client.settings.notifications');
    Route::post('/client/settings/destroy', [ClientSettingsController::class, 'destroyAccount'])->name('client.settings.destroy');

    // Unified Role-Aware Settings Redirect
    Route::get('/settings', function (Request $request) {
        if ($request->user()->role === 'admin') {
            return redirect()->route('admin.settings');
        }
        if ($request->user()->role === 'instructor') {
            return redirect()->route('instructor.settings');
        }
        if ($request->user()->role === 'school') {
            return redirect()->route('school.settings');
        }

        return redirect()->route('client.settings');
    })->name('settings');

    // Legacy aliases redirecting to unified settings
    Route::get('/settings/profile', fn () => redirect()->route('settings'));
    Route::get('/settings/password', fn () => redirect()->route('settings'));
    Route::get('/settings/appearance', fn () => redirect()->route('settings'));

    // Weather Dashboard
    Route::get('/weather', [WeatherController::class, 'index'])->name('weather');
    Route::get('/client/weather', [WeatherController::class, 'index'])->name('client.weather');
    Route::get('/instructor/weather', [WeatherController::class, 'index'])->name('instructor.weather');
    Route::get('/school/weather', [WeatherController::class, 'index'])->name('school.weather');
});

// School Portal
Route::middleware(['auth', 'school'])->prefix('school')->name('school.')->group(function () {
    // 1. Dashboard
    Route::get('/dashboard', [App\Http\Controllers\School\DashboardController::class, 'index'])->name('dashboard');

    // 2. School Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile');
    Route::post('/profile', [ProfileController::class, 'update'])->name('profile.update');

    // 3. Manage Instructors Roster
    Route::get('/instructors', [InstructorRosterController::class, 'index'])->name('instructors');
    Route::post('/instructors/invite', [InstructorRosterController::class, 'invite'])->name('instructors.invite');
    Route::post('/instructors/coach', [InstructorRosterController::class, 'storeCoach'])->name('instructors.storeCoach');
    Route::delete('/instructors/{instructor}', [InstructorRosterController::class, 'remove'])->name('instructors.remove');

    // 4. Packages Management
    Route::get('/packages', [PackageController::class, 'index'])->name('packages');
    Route::post('/packages', [PackageController::class, 'store'])->name('packages.store');
    Route::match(['put', 'post'], '/packages/{package}', [PackageController::class, 'update'])->name('packages.update');
    Route::match(['patch', 'post'], '/packages/{package}/toggle', [PackageController::class, 'toggle'])->name('packages.toggle');
    Route::delete('/packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');

    // 5. Bookings across School Roster
    Route::get('/bookings', [App\Http\Controllers\School\BookingController::class, 'index'])->name('bookings');
    Route::post('/bookings/{booking}/status', [App\Http\Controllers\School\BookingController::class, 'updateStatus'])->name('bookings.status');

    // 5. Messages
    Route::get('/messages', [App\Http\Controllers\School\MessageController::class, 'index'])->name('messages');
    Route::get('/messages/{conversation}', [App\Http\Controllers\School\MessageController::class, 'show'])->name('messages.show');
    Route::post('/messages/{conversation}', [App\Http\Controllers\School\MessageController::class, 'store'])->name('messages.store');
    Route::post('/messages/start', [App\Http\Controllers\School\MessageController::class, 'start'])->name('messages.start');

    // 6. Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
    Route::post('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::post('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
    Route::post('/settings/email', [SettingsController::class, 'updateEmail'])->name('settings.email');
    Route::post('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::post('/settings/deactivate', [SettingsController::class, 'deactivate'])->name('settings.deactivate');
});

// Instructor Portal
Route::middleware(['auth', 'instructor'])->prefix('instructor')->name('instructor.')->group(function () {
    // 1. Dashboard
    Route::get('/dashboard', [InstructorDashboardController::class, 'index'])
        ->name('dashboard');

    // 2. Profile
    Route::get('/profile', [InstructorProfileController::class, 'edit'])
        ->name('profile');
    Route::post('/profile', [InstructorProfileController::class, 'update'])
        ->name('profile.update');
    Route::match(['patch', 'post'], '/profile/availability-status', [InstructorProfileController::class, 'updateAvailabilityStatus'])
        ->name('profile.availabilityStatus');

    // 3. Availability Calendar
    Route::get('/availability', [AvailabilityController::class, 'index'])
        ->name('availability');
    Route::post('/availability', [AvailabilityController::class, 'store'])
        ->name('availability.store');
    Route::delete('/availability/{availability}', [AvailabilityController::class, 'destroy'])
        ->name('availability.destroy');

    // 4. Bookings
    Route::get('/bookings', [InstructorBookingController::class, 'index'])
        ->name('bookings');
    Route::post('/bookings/{booking}/accept', [InstructorBookingController::class, 'accept'])
        ->name('bookings.accept');
    Route::post('/bookings/{booking}/decline', [InstructorBookingController::class, 'decline'])
        ->name('bookings.decline');

    // 5. Revenue & Earnings
    Route::get('/revenue', [RevenueController::class, 'index'])
        ->name('revenue');

    // 6. Reviews
    Route::get('/reviews', [ReviewController::class, 'index'])
        ->name('reviews');
    Route::post('/reviews/{review}/reply', [ReviewController::class, 'reply'])
        ->name('reviews.reply');

    // 7. Messages
    Route::get('/messages', [MessageController::class, 'index'])
        ->name('messages');
    Route::get('/messages/{conversation}', [MessageController::class, 'show'])
        ->name('messages.show');
    Route::post('/messages/{conversation}', [MessageController::class, 'store'])
        ->name('messages.store');

    // 8. School Hire Requests
    Route::get('/hire-requests', [HireRequestController::class, 'index'])
        ->name('hire-requests');
    Route::post('/hire-requests/{hireRequest}/accept', [HireRequestController::class, 'accept'])
        ->name('hire-requests.accept');
    Route::post('/hire-requests/{hireRequest}/decline', [HireRequestController::class, 'decline'])
        ->name('hire-requests.decline');
    Route::post('/hire-requests/{hireRequest}/counter', [HireRequestController::class, 'counter'])
        ->name('hire-requests.counter');

    // 9. Browse Other Instructors
    Route::get('/browse', [BrowseInstructorController::class, 'index'])
        ->name('browse');

    // 10. Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications');
    Route::post('/notifications/read', [NotificationController::class, 'markAsRead'])
        ->name('notifications.read');

    // 11. Settings
    Route::get('/settings', [InstructorSettingsController::class, 'index'])
        ->name('settings');
    Route::post('/settings/profile', [InstructorSettingsController::class, 'updateProfile'])
        ->name('settings.profile');
    Route::post('/settings/password', [InstructorSettingsController::class, 'updatePassword'])
        ->name('settings.password');
    Route::post('/settings/email', [InstructorSettingsController::class, 'updateEmail'])
        ->name('settings.email');
    Route::post('/settings/notifications', [InstructorSettingsController::class, 'updateNotificationPreferences'])
        ->name('settings.notifications');
    Route::post('/settings/deactivate', [InstructorSettingsController::class, 'deactivate'])
        ->name('settings.deactivate');
});

// Fallback alias for legacy /instructor/{id}
Route::get('/instructor/{instructor}', [InstructorController::class, 'show'])->whereNumber('instructor');

// Admin Portal Routes
Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    // 1. Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // 2. Approvals
    Route::get('/approvals', [ApprovalController::class, 'index'])->name('approvals');
    Route::post('/approvals/instructors/{instructor}/approve', [ApprovalController::class, 'approveInstructor'])->name('approvals.instructors.approve');
    Route::post('/approvals/instructors/{instructor}/reject', [ApprovalController::class, 'rejectInstructor'])->name('approvals.instructors.reject');
    Route::post('/approvals/instructors/{instructor}/request-info', [ApprovalController::class, 'requestInfoInstructor'])->name('approvals.instructors.requestInfo');

    Route::post('/approvals/schools/{school}/approve', [ApprovalController::class, 'approveSchool'])->name('approvals.schools.approve');
    Route::post('/approvals/schools/{school}/reject', [ApprovalController::class, 'rejectSchool'])->name('approvals.schools.reject');
    Route::post('/approvals/schools/{school}/request-info', [ApprovalController::class, 'requestInfoSchool'])->name('approvals.schools.requestInfo');

    // 3. Instructors Management
    Route::get('/instructors', [App\Http\Controllers\Admin\InstructorController::class, 'index'])->name('instructors');
    Route::post('/instructors/{instructor}/suspend', [App\Http\Controllers\Admin\InstructorController::class, 'suspend'])->name('instructors.suspend');
    Route::post('/instructors/{instructor}/reactivate', [App\Http\Controllers\Admin\InstructorController::class, 'reactivate'])->name('instructors.reactivate');
    Route::delete('/instructors/{instructor}', [App\Http\Controllers\Admin\InstructorController::class, 'destroy'])->name('instructors.destroy');

    // 4. Schools Management
    Route::get('/schools', [SchoolController::class, 'index'])->name('schools');
    Route::post('/schools/{school}/suspend', [SchoolController::class, 'suspend'])->name('schools.suspend');
    Route::post('/schools/{school}/reactivate', [SchoolController::class, 'reactivate'])->name('schools.reactivate');
    Route::delete('/schools/{school}', [SchoolController::class, 'destroy'])->name('schools.destroy');

    // 5. Clients Management
    Route::get('/clients', [ClientController::class, 'index'])->name('clients');
    Route::post('/clients/{user}/suspend', [ClientController::class, 'suspend'])->name('clients.suspend');
    Route::post('/clients/{user}/reactivate', [ClientController::class, 'reactivate'])->name('clients.reactivate');
    Route::delete('/clients/{user}', [ClientController::class, 'destroy'])->name('clients.destroy');

    // 5b. Users Management (Admin Only)
    Route::get('/users', [UserController::class, 'index'])->name('users');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::match(['patch', 'post'], '/users/{user}/role', [UserController::class, 'assignRole'])->name('users.role');
    Route::post('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggleStatus');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::get('/users/{user}/messages', [UserController::class, 'messages'])->name('users.messages');
    Route::post('/users/{user}/message', [UserController::class, 'sendMessage'])->name('users.message');

    // 6. Bookings Management
    Route::get('/bookings', [App\Http\Controllers\Admin\BookingController::class, 'index'])->name('bookings');
    Route::post('/bookings/{booking}/cancel', [App\Http\Controllers\Admin\BookingController::class, 'cancel'])->name('bookings.cancel');

    // 7. Reviews Moderation
    Route::get('/reviews', [App\Http\Controllers\Admin\ReviewController::class, 'index'])->name('reviews');
    Route::post('/reviews/{review}/toggle-visibility', [App\Http\Controllers\Admin\ReviewController::class, 'toggleVisibility'])->name('reviews.toggleVisibility');
    Route::delete('/reviews/{review}', [App\Http\Controllers\Admin\ReviewController::class, 'destroy'])->name('reviews.destroy');

    // 8. Messages Monitor
    Route::get('/messages', [App\Http\Controllers\Admin\MessageController::class, 'index'])->name('messages');

    // 9. Weather
    Route::get('/weather', [WeatherController::class, 'index'])->name('weather');

    // 10. Notifications
    Route::get('/notifications', [App\Http\Controllers\Admin\NotificationController::class, 'index'])->name('notifications');

    // 11. Settings
    Route::get('/settings', [SettingController::class, 'index'])->name('settings');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update');

    // 12. Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs');
    Route::get('/audit-logs/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
});

require __DIR__.'/auth.php';
