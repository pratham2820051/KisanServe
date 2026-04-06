# Implementation Plan: AgriConnect Smart Farming Service Platform

## MVP Scope (Minimum Viable Product)

**Phase 1 — Demo Version (core platform):**
- User Authentication (OTP-based login, role selection)
- Service Marketplace (location-based listing, filters)
- Booking System (create → accept → complete lifecycle)
- Basic AI Chatbot (GPT responses without full RAG pipeline)

**Phase 2 — Usability:**
- Feedback and Rating System
- Multi-Language Support (i18next + Google Translate)
- Push Notifications (Firebase Cloud Messaging)

**Phase 3 — Smart Features:**
- Crop Doctor (AI image diagnosis)
- GPS Tracking (real-time provider location)
- Offline Mode (local cache + sync)
- Smart Recommendation System

**Phase 4 — Advanced / Research:**
- AI Price Prediction
- Trust Score System
- SMS Gateway (offline access)
- Smart Farming Calendar

---

## Overview

Incremental implementation starting with the core backend foundation (auth, data models, marketplace), then layering in booking lifecycle, AI features, real-time services, and finally advanced features (GPS, offline, SMS, calendar, trust score, price prediction). Each task builds on the previous and ends with integration.

## Tasks

- [x] 1. Project scaffolding and core infrastructure
  - Initialize Node.js/Express backend with TypeScript, folder structure (`routes/`, `controllers/`, `models/`, `middleware/`, `services/`, `jobs/`)
  - Initialize React Native mobile app and React web app with i18next configured for 7 languages (EN, HI, KN, MR, TE, TA, ML)
  - Configure MongoDB connection with Mongoose, Redis client, and BullMQ queue setup
  - Set up JWT middleware, RBAC middleware stubs for Farmer / Service_Provider / Admin roles
  - Configure environment variables for OpenAI, Firebase, Twilio, Google Translate, Weather API keys
  - _Requirements: 1.6, 4.1, 17.4, 18.1, 18.4_

- [x] 2. User authentication (Auth_Service + OTP_Service)
  - [x] 2.1 Implement `POST /auth/login` — accept phone + role, create user if new (fields: name, phone, role, location, languagePreference), trigger OTP generation and SMS dispatch via Twilio
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Implement `POST /auth/verify-otp` — validate OTP within 5-minute TTL, issue JWT on success, return descriptive error on failure, lock account for 15 min after 3 consecutive failures
    - _Requirements: 1.3, 1.4, 1.5, 18.3_
  - [x] 2.3 Implement OTP rate limiting middleware (max 5 OTP requests per phone per hour)
    - _Requirements: 18.2_
  - [ ]* 2.4 Write unit tests for OTP validation logic (valid OTP, expired OTP, wrong OTP, lockout after 3 failures)
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ]* 2.5 Write property test for auth session token
    - **Property: Any valid OTP submitted within TTL always produces a non-null session token; any invalid or expired OTP never produces a token**
    - **Validates: Requirements 1.3, 1.4**

- [x] 3. MongoDB data models
  - [x] 3.1 Define Mongoose schemas: `User` (with trust_score field), `Service` (with geospatial location, category, price, availability), `Booking` (with status enum: Pending/Accepted/InProgress/Completed/Cancelled), `Feedback` (with is_flagged), `Alert`, `FarmingCalendar`
    - Add geospatial index on `Service.location`, compound index on `Booking.(status, date)`
    - _Requirements: 2.1, 3.1, 7.1, 11.1, 16.1, 19.1_
  - [ ]* 3.2 Write property test for Booking status transitions
    - **Property: A booking status can only advance through the valid state machine (Pending → Accepted → InProgress → Completed; Pending/Accepted → Cancelled) and never regress**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 4. Service Marketplace (Marketplace)
  - [x] 4.1 Implement `GET /services` — filter by location radius (geospatial query), category, price, rating, distance; exclude unavailable listings; return within 2 s; cache results in Redis (TTL 60 s)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 17.4_
  - [x] 4.2 Implement `POST /services`, `PATCH /services/:id`, `DELETE /services/:id` for Service_Provider listing management; on delete, cancel all Pending bookings and notify Farmers
    - _Requirements: 8.1, 8.2, 8.5_
  - [ ]* 4.3 Write unit tests for marketplace filtering (location radius, unavailable exclusion, no-results message)
    - _Requirements: 2.2, 2.5, 2.6_

- [x] 5. Booking lifecycle (Booking_System)
  - [x] 5.1 Implement `POST /bookings` — validate no duplicate active booking for same service + time slot, create record with status Pending, push notification to Service_Provider via Firebase
    - _Requirements: 3.1, 3.7_
  - [x] 5.2 Implement `PATCH /bookings/:id` — handle status transitions: Accepted (notify Farmer), InProgress, Completed (prompt Farmer for rating), Cancelled (notify other party)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 5.3 Implement BullMQ job: auto-cancel Pending bookings not responded to within 24 hours, notify Farmer
    - _Requirements: 3.6_
  - [ ]* 5.4 Write unit tests for booking creation (duplicate prevention, status transitions, auto-cancel job)
    - _Requirements: 3.1, 3.6, 3.7_
  - [ ]* 5.5 Write property test for booking duplicate prevention
    - **Property: For any (farmerId, serviceId, timeSlot) triple, at most one active booking (Pending/Accepted/InProgress) can exist at any time**
    - **Validates: Requirements 3.7**

- [x] 6. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 7. Feedback and Rating System (Feedback_System + Fraud_Detector)
  - [x] 7.1 Implement `POST /feedback` — allow Farmer and Service_Provider to each submit one rating (1–5) + optional comment per completed booking; update Service_Provider average rating; make visible within 60 s
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 7.2 Implement Fraud_Detector stub — flag reviews matching anomaly heuristics (e.g., multiple reviews from same IP in short window, rating outlier) and set `is_flagged = true` before publishing
    - _Requirements: 7.6, 9.4_
  - [ ]* 7.3 Write unit tests for feedback submission (one-per-booking enforcement, average rating recalculation, fraud flag)
    - _Requirements: 7.3, 7.4, 7.6_

- [x] 8. Provider Dashboard (Provider_Dashboard)
  - Implement `GET /provider/bookings` — return bookings grouped by status
  - Implement `GET /provider/earnings` — sum of Completed booking prices
  - Wire listing create/update/delete from Task 4.2 into dashboard endpoints
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Admin Panel (Admin_Panel)
  - [x] 9.1 Implement `PATCH /admin/users/:id` — deactivate/reactivate account; on deactivation of Service_Provider, cancel all Pending/Accepted bookings and notify Farmers
    - _Requirements: 9.1, 9.2_
  - [x] 9.2 Implement `PATCH /admin/services/:id` — approve, reject, or remove listing
    - _Requirements: 9.3_
  - [x] 9.3 Implement `GET /admin/flagged-reviews` and `PATCH /admin/reviews/:id` — list flagged reviews, approve or remove
    - _Requirements: 9.4_
  - [x] 9.4 Implement `GET /admin/analytics` — total users by role, bookings by status, active listings by category, revenue for selectable date range; surface flagged accounts from Trust_Score_Engine
    - _Requirements: 9.5, 9.6, 19.4_

- [x] 10. Multi-Language Support (Language_Service)
  - [x] 10.1 Configure i18next on frontend with translation bundles for all 7 languages; implement language switcher that applies new language within the same session without full reload
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 10.2 Implement backend translation middleware: for dynamic content not available in user's language, call Google Translate API; on API failure, fall back to English and return a notification flag
    - _Requirements: 4.4, 4.5_
  - [ ]* 10.3 Write unit tests for language fallback (Translate API unavailable → English content + notification)
    - _Requirements: 4.5_

- [x] 11. Real-Time Alert System (Notification_Service)
  - [x] 11.1 Implement alert ingestion service: consume weather/market/scheme events, filter Farmers by registered location, localize alert text via Language_Service, publish FCM push notifications per Farmer within 2 min
    - _Requirements: 6.1, 6.2, 6.5_
  - [x] 11.2 Implement `PATCH /users/:id/alert-preferences` — opt-out per alert category; filter delivery accordingly
    - _Requirements: 6.3_
  - [x] 11.3 Configure FCM for offline queuing — alerts delivered on device reconnect
    - _Requirements: 6.4_

- [x] 12. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 13. AI Chatbot (AI_Chatbot + RAG pipeline)
  - [x] 13.1 Build RAG indexing script: chunk agricultural documents, generate embeddings via `text-embedding-ada-002`, upsert into Pinecone (or pgvector)
    - _Requirements: 5.3_
  - [x] 13.2 Implement `POST /chatbot/query` — embed query, cosine similarity search for top-k chunks, inject chunks into GPT-4 prompt, return grounded response within 5 s; translate response to Farmer's language if needed; do not persist PII beyond session
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 18.5_
  - [x] 13.3 Apply rate limiting middleware on `/chatbot/query` to control AI API costs
    - _Requirements: 17.3_
  - [ ]* 13.4 Write unit tests for chatbot (response within 5 s, no-answer fallback, PII non-persistence)
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 14. Voice-Based Interaction (Voice_Assistant)
  - [x] 14.1 Integrate speech-to-text (STT) on the React Native client for all 7 supported languages; convert voice input to text within 3 s and route to `/chatbot/query` or booking flow
    - _Requirements: 5.2, 14.1, 14.2, 14.3_
  - [x] 14.2 Integrate text-to-speech (TTS) on the client to read system responses aloud; show retry prompt on STT failure
    - _Requirements: 14.4, 14.5_

- [x] 15. Crop Doctor (Crop_Doctor)
  - [x] 15.1 Implement `POST /crop-doctor/analyze` — accept multipart image upload from camera or gallery, run inference via fine-tuned CNN/vision transformer, return condition label + confidence + treatment from lookup table within 5 s
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  - [x] 15.2 Add confidence threshold check: if below threshold, append expert consultation notice instead of returning a potentially incorrect diagnosis
    - _Requirements: 13.4_
  - [ ]* 15.3 Write unit tests for Crop Doctor (successful diagnosis, low-confidence fallback, timeout fallback)
    - _Requirements: 13.1, 13.4_

- [x] 16. Smart Recommendation System (Recommendation_Engine)
  - Implement `GET /recommendations` — for Farmers with history: rank services by location + booking history; for new Farmers: rank by location + highest-rated per category; update after each completed booking; cache in Redis
    - Display trust score alongside each listing (wire Trust_Score_Engine output)
    - _Requirements: 10.1, 10.2, 10.3, 17.4, 19.3_

- [x] 17. Trust Score System (Trust_Score_Engine)
  - [x] 17.1 Implement trust score calculation function: weighted formula over booking completion rate, average feedback rating, and platform activity; store result in `User.trust_score`
    - _Requirements: 19.1_
  - [x] 17.2 Enqueue BullMQ job to recalculate trust score asynchronously after each completed or cancelled booking; flag accounts below threshold in Admin_Panel
    - _Requirements: 19.2, 19.4_
  - [ ]* 17.3 Write property test for trust score monotonicity
    - **Property: A user who completes more bookings with higher ratings never has a lower trust score than the same user with fewer completions and lower ratings (all else equal)**
    - **Validates: Requirements 19.1, 19.2**

- [x] 18. GPS Tracking (GPS_Tracker)
  - [x] 18.1 Implement WebSocket channel `/ws/tracking/:bookingId` — Service_Provider client emits location every ≤30 s while booking is InProgress (only when location permission granted); broadcast to Farmer client
    - _Requirements: 11.1, 11.3_
  - [x] 18.2 On booking status change to Completed or Cancelled, close the WebSocket channel and stop location sharing; on GPS signal loss, emit last known location with a stale flag
    - _Requirements: 11.2, 11.4_

- [x] 19. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 20. SMS-Based Offline Access (SMS_Gateway)
  - Implement Twilio inbound webhook handler: parse predefined SMS commands (book service, check booking status), route to Booking_System, respond via SMS within 1 min; return help message for unrecognized commands
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 21. Smart Farming Calendar (Farming_Calendar)
  - [x] 21.1 Implement calendar generation service: fetch crop type + location + current weather data, generate personalized schedule (irrigation, fertilizer, harvest), store in `FarmingCalendar` collection
    - _Requirements: 16.1_
  - [x] 21.2 Implement BullMQ job to send scheduled notifications for calendar events; re-generate schedule when weather data changes
    - _Requirements: 16.2, 16.3_

- [x] 22. AI Price Prediction (Price_Predictor)
  - [x] 22.1 Implement price prediction model/service: analyze historical booking data and seasonal patterns to forecast price trends (rising/stable/falling) per service category; update predictions every 24 h via BullMQ job
    - _Requirements: 20.1, 20.4_
  - [x] 22.2 Expose price trend indicator and optimal booking window on `GET /services` response; wire into Marketplace listing display
    - _Requirements: 20.2, 20.3_

- [x] 23. Offline Mode (Offline_Store)
  - [x] 23.1 Implement client-side offline store using React Native AsyncStorage / IndexedDB (web): cache service listings, booking history, and chatbot responses on load
    - _Requirements: 12.1_
  - [x] 23.2 Implement offline booking queue: store booking requests locally when offline, submit to `POST /bookings` on reconnect, notify Farmer of sync result; detect and surface conflicts (e.g., time slot no longer available) with resolution options
    - _Requirements: 12.2, 12.3, 12.4_

- [x] 24. Performance, caching, and scalability wiring
  - Verify Redis caching is applied to: service listings, recommendations, user profiles (TTL appropriate per data type)
  - Verify all non-time-critical operations (notifications, trust score, price prediction, calendar jobs) run through BullMQ queues
  - Add API response time logging middleware; confirm p95 < 2 s target is measurable
  - _Requirements: 17.1, 17.2, 17.4, 17.5_

- [x] 25. Security hardening
  - Audit all endpoints for RBAC middleware coverage (Farmer / Service_Provider / Admin)
  - Verify AES-256 encryption at rest for sensitive fields (phone, location) and TLS 1.2+ in transit
  - Add input validation and sanitization middleware (NoSQL injection, XSS prevention) on all routes
  - Confirm JWT short-lived token + refresh token flow is implemented
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 26. Final integration and wiring
  - [x] 26.1 Wire all frontend screens (Farmer home, Marketplace, Booking flow, Chatbot, Crop Doctor, Calendar, Provider Dashboard, Admin Panel) to their respective backend endpoints
    - _Requirements: 2.1–2.6, 3.1–3.7, 5.1–5.6, 8.1–8.5, 9.1–9.6_
  - [x] 26.2 Integrate Notification_Service push alerts into booking status changes, alert delivery, and calendar notifications end-to-end
    - _Requirements: 3.2, 3.5, 6.1–6.5, 16.2_
  - [ ]* 26.3 Write integration tests for the full booking lifecycle (create → accept → start → complete → feedback)
    - _Requirements: 3.1–3.5, 7.1–7.5_
  - [ ]* 26.4 Write integration tests for the AI chatbot flow (voice input → STT → RAG query → translated response → TTS)
    - _Requirements: 5.1–5.4, 14.1–14.4_

- [x] 27. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 6, 12, 19, and 27 ensure incremental validation
- Property tests validate universal correctness invariants; unit tests cover specific examples and edge cases
- The AI Layer (chatbot, Crop Doctor, price predictor) is designed as an independent service for separate scaling
