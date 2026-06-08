# Profile and Settings Pages Implementation Plan

This plan describes the additions to the Go backend (`duluin_chat_be`) to support retrieving and updating user profile details and settings, and the creation of Profile and Settings pages in the React/Next.js frontend (`duluin_chat_fe`).

## User Review Required

> [!NOTE]
> - The new pages will use the existing design system (Tailwind CSS) and follow a similar structure to the chat pages: a sidebar on the left (desktop) and the form content on the right.
> - Authentication is managed by Next.js middleware, so these pages will only be accessible to logged-in users.

## Proposed Changes

---

### Backend Support (`duluin_chat_be`)

#### [MODIFY] [user_repository.go](file:///media/PersonalData/laragon/www/duluin_chat_be/app/repository/user_repository.go)
- Modify `FindUserByID` to preload `UserSettings` relation.
- Add `FindUserSettingsByUserID` to retrieve a user's settings.
- Add `UpdateUserSettings` to save user settings.
- Add `UpdateUser` to update user profile fields (`first_name`, `last_name`, `avatar_url`).

#### [MODIFY] [user_service.go](file:///media/PersonalData/laragon/www/duluin_chat_be/app/service/user_service.go)
- Add `UpdateUserProfile` orchestrator.
- Add `UpdateUserSettings` orchestrator.

#### [MODIFY] [user_controller.go](file:///media/PersonalData/laragon/www/duluin_chat_be/app/controller/user_controller.go)
- Add `UpdateUserProfile` route handler.
- Add `UpdateUserSettings` route handler.

#### [MODIFY] [user.go](file:///media/PersonalData/laragon/www/duluin_chat_be/routes/v1/user.go)
- Register `PUT /users/:user_id` for profile updates.
- Register `PUT /users/:user_id/settings` for settings updates.

---

### Frontend Pages (`duluin_chat_fe`)

#### [MODIFY] [chatUserService.ts](file:///media/PersonalData/laragon/www/duluin_chat_fe/services/chatUserService.ts)
- Add `updateUserProfile` API helper.
- Add `updateUserSettings` API helper.

#### [NEW] [profile/page.tsx](file:///media/PersonalData/laragon/www/duluin_chat_fe/app/profile/page.tsx)
- Create a modern, responsive user profile form.
- Allow editing `first_name`, `last_name`, and `avatar_url`.
- Display read-only info (`email`, `phone`, `user_type`, `tenant_id`).
- Integrate Sidebar for a consistent layout.

#### [NEW] [settings/page.tsx](file:///media/PersonalData/laragon/www/duluin_chat_fe/app/settings/page.tsx)
- Create a settings form.
- Allow toggling Notification Preferences (`email` and `push` notifications).
- Allow selecting Theme (`light`, `dark`) and Language (`en`, `id`).
- Integrate Sidebar for a consistent layout.

---

## Verification Plan

### Automated Tests
- Run `go build` to verify Go backend compilation.
- Run `npm run lint` and validation builds on the frontend.

### Manual Verification
- Log in, navigate to Profile, update profile data, and verify database and UI updates.
- Navigate to Settings, update theme, language, and notifications, and verify persistence.
