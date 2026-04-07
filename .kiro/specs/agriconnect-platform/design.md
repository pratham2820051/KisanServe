# Design Document

## Overview

KisanServe is a multi-role Smart Farming Service Platform built on a layered architecture. The system connects Farmers, Service Providers, and Admins through a React/React Native frontend, a Node.js/Express REST API backend, a MongoDB database, an AI layer (OpenAI GPT + RAG), and a Firebase notification service. The design prioritizes offline resilience, multi-language support, and low-literacy usability for rural users.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   React Native (Mobile)  │  React (Web)                 │
│   Voice_Assistant  │  Offline_Store  │  Language_Service│
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND API LAYER                     │
│              Node.js + Express (REST API)               │
│  Auth_Service │ Booking_System │ Marketplace            │
│  Feedback_System │ Provider_Dashboard │ Admin_Panel     │
│  SMS_Gateway │ GPS_Tracker │ Farming_Calendar           │
│  Trust_Score_Engine │ Price_Predictor                   │
└──────┬───────────────────┬──────────────────────────────┘
       │                   │
┌──────▼──────┐   ┌────────▼────────────────────────────┐
│  DATABASE   │   │           AI LAYER                  │
│  MongoDB    │   │  AI_Chatbot (OpenAI GPT + RAG)      │
│  Collections│   │  Crop_Doctor (Image Classification) │
│  Users      │   │  Recommendation_Engine              │
│  Services   │   │  Price_Predictor                    │
│  Bookings   │   │  Vector DB (embeddings + search)    │
│  Feedback   │   └─────────────────────────────────────┘
│  Alerts     │
└─────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│              NOTIFICATION & EXTERNAL SERVICES           │
│  Firebase Cloud Messaging (push notifications)          │
│  Twilio / SMS provider (SMS_Gateway)                    │
│  Google Translate API (Language_Service)                │
│  Weather API (Farming_Calendar + Alert System)          │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

- Frontend: Renders UI in the user's selected language, handles voice input/output, caches data for offline use, and communicates with the backend via REST APIs and WebSockets for real-time updates.
- Backend API: Stateless REST API handling all business logic — authentication, booking lifecycle, marketplace queries, dashboard operations, and admin functions. Delegates AI tasks to the AI Layer asynchronously.
- Database: MongoDB stores all persistent data. Collections are indexed on location (geospatial), user ID, and booking status for query performance.
- AI Layer: Handles all machine-learning workloads — RAG-based chatbot, image-based crop diagnosis, price prediction, and service recommendations. Operates as a separate service to allow independent scaling.
- Notification & External Services: Firebase delivers push notifications; Twilio handles SMS; Google Translate handles dynamic content translation; a Weather API feeds the alert system and Farming Calendar.

---

## Data Flow

### Flow 1: Service Booking

```
Farmer (App)
  → selects service and time slot
  → POST /bookings  (Backend API)
  → Booking_System validates slot availability  (MongoDB: Bookings)
  → creates Booking record with status = Pending
  → Notification_Service sends push alert to Service_Provider  (Firebase)
  → Service_Provider accepts  →  PATCH /bookings/:id  (status = Accepted)
  → Notification_Service notifies Farmer
  → Service_Provider marks complete  →  status = Completed
  → Feedback_System prompts Farmer for rating
```

### Flow 2: AI Chatbot Query

```
Farmer (App)
  → types or speaks a query
  → Voice_Assistant converts speech → text  (if voice input)
  → POST /chatbot/query  (Backend API)
  → AI_Chatbot embeds query using text embedding model
  → Vector DB performs similarity search over agriculture knowledge base
  → top-k relevant document chunks retrieved  (RAG retrieval)
  → chunks + query sent to OpenAI GPT as context  (augmented generation)
  → GPT generates grounded response
  → Language_Service translates response to Farmer's language  (if needed)
  → response returned to Farmer  (text + TTS audio if voice mode)
```

### Flow 3: Crop Doctor Image Diagnosis

```
Farmer (App)
  → captures or selects crop image
  → POST /crop-doctor/analyze  (multipart image upload)
  → Crop_Doctor preprocesses image
  → AI image classification model runs inference
  → returns: detected condition, confidence score, suggested treatment
  → IF confidence < threshold  →  append expert consultation notice
  → response displayed to Farmer with treatment steps
```

### Flow 4: Real-Time Alert Delivery

```
Weather API / Market Data Source
  → triggers alert event
  → Backend Alert Service filters affected Farmers by location
  → Notification_Service publishes FCM push notification per Farmer
  → Language_Service localizes alert text to each Farmer's language
  → IF Farmer device offline  →  FCM queues and delivers on reconnect
```

---

## ER Diagram

```
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│    USERS     │        │    BOOKINGS      │        │   SERVICES   │
│──────────────│        │──────────────────│        │──────────────│
│ user_id (PK) │◄──┐    │ booking_id (PK)  │    ┌──►│ service_id(PK│
│ name         │   └────│ farmer_id (FK)   │    │   │ type         │
│ phone        │        │ service_id (FK)──┼────┘   │ provider_id  │
│ role         │◄───────│ provider_id (FK) │        │   (FK→USERS) │
│ language     │        │ status           │        │ price        │
│ location     │        │ date             │        │ availability │
│ trust_score  │        │ time_slot        │        │ category     │
└──────────────┘        └──────────────────┘        └──────────────┘
       │                                                    │
       │                ┌──────────────────┐               │
       │                │    FEEDBACK      │               │
       │                │──────────────────│               │
       └───────────────►│ feedback_id (PK) │               │
                        │ booking_id (FK)  │               │
                        │ reviewer_id (FK) │               │
                        │ reviewee_id (FK) │               │
                        │ rating (1–5)     │               │
                        │ comment          │               │
                        │ is_flagged       │               │
                        └──────────────────┘               │
                                                           │
       ┌──────────────────┐        ┌──────────────────┐   │
       │     ALERTS       │        │  FARMING_CALENDAR│   │
       │──────────────────│        │──────────────────│   │
       │ alert_id (PK)    │        │ calendar_id (PK) │   │
       │ type             │        │ farmer_id (FK)   │   │
       │ message          │        │ crop_type        │   │
       │ target_location  │        │ schedule_json    │   │
       │ created_at       │        │ last_updated     │   │
       └──────────────────┘        └──────────────────┘
```

### Relationships Summary

| Relationship | Type | Description |
|---|---|---|
| User → Bookings (as Farmer) | 1 : Many | A Farmer can have many bookings |
| User → Bookings (as Provider) | 1 : Many | A Provider can fulfill many bookings |
| User → Services | 1 : Many | A Provider can list many services |
| Service → Bookings | 1 : Many | A service can be booked many times |
| Booking → Feedback | 1 : 0..2 | Each booking can have up to 2 feedback records (one per party) |
| User → Farming_Calendar | 1 : 1 | Each Farmer has one active calendar |

---

## AI Technical Design

### RAG Pipeline (AI Chatbot)

The AI_Chatbot uses a Retrieval-Augmented Generation architecture to ground responses in verified agricultural knowledge rather than relying solely on GPT's parametric memory.

1. Indexing: Agricultural documents (crop guides, government advisories, local farming practices) are chunked and converted into dense vector embeddings using a text embedding model (e.g., `text-embedding-ada-002`).
2. Storage: Embeddings are stored in a vector database (e.g., Pinecone or pgvector) indexed for approximate nearest-neighbour search.
3. Retrieval: At query time, the Farmer's query is embedded using the same model. A cosine similarity search retrieves the top-k most relevant document chunks from the vector database.
4. Generation: The retrieved chunks are injected into the GPT prompt as context. GPT generates a response grounded in the retrieved knowledge, reducing hallucination.
5. Language: If the query is in a regional language, it is translated to English for retrieval, and the response is translated back to the Farmer's language before delivery.

```
Query → Embed → Vector Search → Top-K Chunks → GPT Prompt → Response
```

### Crop Doctor (Image Classification)

The Crop_Doctor uses a fine-tuned convolutional neural network (CNN) or vision transformer model trained on labelled crop disease datasets (e.g., PlantVillage). The model outputs a class label (disease/deficiency/pest), a confidence score, and a treatment recommendation mapped from a lookup table. Images below the confidence threshold are flagged for expert review rather than returning a potentially incorrect diagnosis.

---

## Technology Stack Summary

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native |
| Web Frontend | React |
| Backend API | Node.js + Express |
| Database | MongoDB (with geospatial indexes) |
| Vector Database | Pinecone or pgvector |
| AI Chatbot | OpenAI GPT-4 + RAG |
| Image AI | Fine-tuned CNN / Vision Transformer |
| Push Notifications | Firebase Cloud Messaging |
| SMS | Twilio (or equivalent SMS provider) |
| Translation | Google Translate API |
| Internationalisation | i18next |
| Hosting | AWS (EC2 / ECS) or Firebase |
| Caching | Redis |

---

## Scalability Considerations

- The Backend API is stateless — no session state is stored on the server — enabling horizontal scaling behind a load balancer without sticky sessions. A load balancer distributes incoming requests across backend instances to ensure high availability and fault tolerance.
- The AI Layer is deployed as an independent service, allowing it to scale separately from the core API based on inference demand without affecting booking or marketplace performance.
- Redis is used as a caching layer for frequently accessed data (service listings, recommendations, user profiles) to reduce MongoDB query load under high traffic.
- Asynchronous job queues (BullMQ) handle non-blocking workloads such as push notification delivery, trust score recalculation, AI price prediction updates, and farming calendar notifications — keeping API response times low.
- MongoDB collections use geospatial indexes on location fields and compound indexes on (status, date) for bookings to maintain query performance as data volume grows.

---

## API Design (Sample)

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/login | Submit phone number to initiate OTP login |
| POST | /auth/verify-otp | Verify OTP and receive session token |
| GET | /services?location=&category= | List services filtered by location and category |
| POST | /bookings | Create a new booking |
| PATCH | /bookings/:id | Update booking status (accept, start, complete, cancel) |
| POST | /chatbot/query | Submit a text or voice query to the AI chatbot |
| POST | /crop-doctor/analyze | Upload a crop image for AI disease diagnosis |
| GET | /alerts?userId= | Fetch pending alerts for a user |
| GET | /recommendations?userId= | Get personalized service recommendations |
| POST | /feedback | Submit a rating and review for a completed booking |

All endpoints require a valid JWT session token in the `Authorization` header except `/auth/login` and `/auth/verify-otp`. Role-based middleware enforces access control per endpoint.

---

## Failure Handling

| Failure Scenario | Handling Strategy |
|---|---|
| OpenAI API unavailable | AI_Chatbot returns a graceful fallback message informing the Farmer the service is temporarily unavailable; cached responses served where applicable |
| Crop Doctor model timeout | Returns a fallback message advising the Farmer to retry or consult a local expert; no partial result is shown |
| MongoDB unavailable | Requests are rejected with a 503 response; read-heavy endpoints serve Redis-cached data where available |
| Google Translate API unavailable | Language_Service falls back to English content and displays a notification to the user |
| Firebase FCM delivery failure | Notification_Service retries delivery with exponential backoff; undelivered alerts are queued and delivered on device reconnect |
| SMS Gateway failure | Critical booking confirmations are retried up to 3 times; Farmer is notified via push notification as a secondary channel |
| GPS signal lost during booking | GPS_Tracker displays last known location with a stale-data indicator; Farmer is notified that location updates are temporarily unavailable |
| Offline device (Farmer) | Offline_Store serves cached listings and queues booking requests locally; sync occurs automatically on reconnect with conflict resolution |

---

## Security Design

- JWT-based authentication is required for all API requests; tokens are short-lived and refreshed via a secure refresh token flow.
- HTTPS is enforced for all client-server communication; HTTP requests are redirected to HTTPS at the load balancer level.
- All user inputs are validated and sanitized server-side to prevent SQL/NoSQL injection, XSS, and command injection attacks.
- Rate limiting is applied on authentication endpoints (OTP requests capped at 5 per hour per phone number) and chatbot endpoints to prevent abuse and control AI API costs.
- Role-based access control (RBAC) is enforced at the API middleware layer — Farmer, Service_Provider, and Admin roles each have a distinct set of permitted endpoints.
- Sensitive data (phone numbers, location, payment-related fields) is encrypted at rest using AES-256 and in transit via TLS 1.2+.

---

## Monitoring & Logging

- Application logs (request/response, errors, background job status) are collected and centralised using the ELK stack (Elasticsearch, Logstash, Kibana) for searchable, real-time log analysis.
- Error tracking is handled by Sentry, which captures unhandled exceptions with full stack traces and alerts the engineering team on new or recurring issues.
- Performance monitoring (API latency, database query times, AI inference duration) is tracked via cloud-native monitoring (AWS CloudWatch or Firebase Performance Monitoring).
- Automated alerts are triggered when API p95 latency exceeds 2 seconds, error rates spike above a defined threshold, or any critical service (database, AI layer, notification service) becomes unreachable.
