This detailed component documentation provides a technical breakdown of the **Kloud Koach** frontend. It is designed to help developers understand the role, state management, and key logic of each file within the `src/pages` directory.

---

## 🏗️ 1. Authentication & Layout

These components handle the user's entry point, identity, and the shared visual "shell" for auth-related pages.

### `Auth.css` & `AuthLayout.jsx`

* **Purpose:** `AuthLayout` acts as a **Higher-Order Component (HOC)** wrapper that provides a split-screen design: a branded left panel with the "Kloud Koach" identity and a flexible right panel for forms.
* **Key Logic:**
* **Responsive Icons:** Uses MUI `sx` breakpoints to change back-button colors between mobile and desktop.
* **Glassmorphism:** `Auth.css` defines `.auth-paper` using `backdrop-filter: blur(10px)` for a modern, high-end feel.



### `LoginPage.jsx` / `RegisterPage.jsx`

* **Purpose:** Capture user credentials and interface with the `AuthContext`.
* **Key Logic:**
* **Conditional Button State:** The "Sign In" button is disabled unless the email is valid and the password field is populated.
* **Navigation:** Uses `useNavigate` to redirect users to `/dashboard` upon successful session creation.



### `ForgotPasswordPage.jsx`

* **Purpose:** A multi-step workflow for account recovery.
* **State Management:**
* `activeStep`: Tracks whether the user is on the **Email Entry** (Step 0) or **OTP/New Password** (Step 1) phase.
* `otp`: Maps to the "token" field required by the backend `resetPassword` API.



---

## 📈 2. Dashboard & User Experience

The central hub where users manage their career assets and view their progress.

### `HomePage.jsx`

* **Purpose:** The main navigation hub featuring a "Module Grid."
* **Feature Gating:**
* Uses `checkAccess(featureCode)` from `AuthContext` to visually "lock" (grayscale/opacity) modules the user hasn't paid for.
* **Payment Interceptor:** A `useEffect` listens for `?payment=success` in the URL to trigger a data refresh and show the "Upgrade Successful" dialog.



### `UserProfile.jsx`

* **Purpose:** Comprehensive user settings, resume management, and subscription control.
* **Logic:**
* **Subscription Toggle:** Dynamically renders "Reactivate" or "Cancel" based on the `usage.subscriptionStatus` retrieved from the backend.
* **Initials Avatar:** A helper function `getInitials()` parses the user's name for the profile header.



---

## 🎙️ 3. Core AI Modules (The "Workhorses")

These pages facilitate the primary value proposition of the app: real-time AI assistance.

### `LiveInterviewPage.jsx`

* **Purpose:** A high-stakes interface for real-time interview help.
* **Key Features:**
* **Fullscreen Mode:** Controlled via `useOutletContext` to hide browser chrome and standard navigation, allowing the user to focus entirely on the interview.
* **Ref Forwarding:** Uses `appRef` to communicate with the `LiveInterviewOpenAI` component (e.g., stopping a session via a parent button).



### `InterviewPreparationPage.jsx`

* **Purpose:** A safe "sandbox" for mock interviews.
* **Logic:** * **Step Transition:** Switches from an `InterviewSetupForm` to the active AI session (`InterviewPrepOpenAI`) once the user clicks "Start."
* **Transcription Sync:** Passes `chatHistory` state down to `InterviewPrepTranscription` to ensure the text-based log updates as the AI speaks.



### `ExamPreparationPage.jsx`

* **Purpose:** Generates custom exam questions based on uploaded materials.
* **External Integration:** * Calls a specific **n8n webhook** (`/webhook/exam-prep`) to generate the initial set of exam data before entering the active session.

---

## 💎 4. Subscription & Payments

### `SubscriptionPage.jsx`

* **Purpose:** Initial plan selection during the registration flow.
* **Logic:** * **Mapping Feature Limits:** Maps backend feature units (e.g., "Tokens", "Minutes") into a user-friendly list (e.g., "10k tokens").
* **Mock Token:** Currently generates a `mock_payment_token` for testing, ready to be replaced by Stripe `PaymentIntent`.



### `UpgradePlanPage.jsx`

* **Purpose:** Managing existing subscriptions (Upgrades/Downgrades).
* **Complex Logic:**
* **Immediate vs. Scheduled:** Handles "Immediate" downgrades (effective now) vs. "Scheduled" (effective at end of billing cycle) through a confirmation modal.
* **Status Handling:** Specifically checks if a user's status is `incomplete` to show a "Pay Now" banner that redirects to the Stripe invoice.



---

## 🛠️ 5. Services & State

* **`api.js`:** The Axios interceptor layer. It automatically injects the Bearer token from `localStorage` into every outgoing request.
* **`resumeStore.js`:** A Zustand store that manages the complex nested object of a resume (Experience, Education, Skills). It includes a **Critical Mapper** that converts the flat AI-parsed JSON from the backend into the keyed arrays required by the UI.

---

To ensure technical clarity for the development team, the following tables document the essential properties (Props) and state-driven data passed between the major page components and their sub-modules.

### 🔐 6. Authentication & Layout Props

These props define the branding and navigation flow for the entry-level pages.

| Component | Prop Name | Type | Description |
| --- | --- | --- | --- |
| **AuthLayout** | `children` | `ReactNode` | The form component to be rendered (Login, Register, etc.). |
|  | `title` | `string` | The bold heading displayed in the branding panel. |
|  | `subtitle` | `string` | Optional supporting text below the title. |
| **ProtectedRoute** | `children` | `ReactNode` | The private page to be rendered if authenticated. |
|  | `role` | `string` | (Optional) Required user role to access the route. |

---

### 🎙️ 7. AI Session Modules (Live & Prep)

These are the most complex components, handling real-time data streams and session states.

| Component | Prop Name | Type | Description |
| --- | --- | --- | --- |
| **LiveInterviewOpenAI** | `formData` | `Object` | Contains `cv`, `jobRole`, and `jobDescription` for AI context. |
|  | `answers` | `string` | The current real-time generated answer from the AI. |
|  | `setAnswers` | `Function` | State setter to update the answer buffer. |
|  | `onConnectionStatusChange` | `Function` | Callback to notify parent of `connecting`, `connected`, or `error`. |
| **InterviewPrepTranscription** | `chatHistory` | `Array` | List of objects containing `role` (user/ai) and `text`. |
|  | `handleClearHistory` | `Function` | Clears the local session log UI. |
|  | `isFullscreen` | `boolean` | Toggles "Glassmorphism" styling for overlay mode. |

---

### 📝 8. Resume & Profile Components

These manage the persistent data stores and user-specific career assets.

| Component | Prop Name | Type | Description |
| --- | --- | --- | --- |
| **CVManager** | `onCVChange` | `Function` | Triggered when a new CV is uploaded or the existing one is deleted. |
| **SessionHistory** | `isWidget` | `boolean` | If `true`, renders a compact version for the profile sidebar. |
| **UsageMonitor** | `usage` | `Object` | The usage object from `AuthContext` (tokens, minutes remaining). |
| **ResumeInputForm** | `onSubmit` | `Function` | Passes the raw text to the parent `handleGenerate` function. |
|  | `isGenerating` | `boolean` | Controls the loading spinner on the "Generate" button. |

---

### 💳 9. Subscription & Upgrade UI

These props handle the sensitive logic of plan transitions and payment states.

| Component | Prop Name | Type | Description |
| --- | --- | --- | --- |
| **PlanCard** (Used in Landing/Upgrade) | `plan` | `Object` | The full plan object from the DB (id, price, features). |
|  | `isCurrent` | `boolean` | Highlights the card if it matches the user's active plan. |
|  | `isDowngrade` | `boolean` | Changes button color to warning/orange. |
|  | `disableAction` | `boolean` | Prevents multiple clicks during API processing. |
