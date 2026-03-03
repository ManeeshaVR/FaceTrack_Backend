# Dream Institute — Main Backend (Node.js)

This is the primary backend server for the Dream Institute application, responsible for data persistence, authentication, and core business logic.

---

## Tech Stack

| Component      | Technology                 |
|----------------|----------------------------|
| Runtime        | Node.js                    |
| Framework      | Express                    |
| Database       | MongoDB (Mongoose ODM)     |
| Authentication | JWT (JSON Web Tokens)      |
| Validation     | Zod                        |

---

## 1) Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Running locally or on Atlas)

### Local Environment
1.  **Clone the repository** (if you haven't already).
2.  **Configure Environment Variables**:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and set your `MONGODB_URI` and `JWT_SECRET`.
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Run in Development mode**:
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:4000`.

---

## 2) Authentication Flow

### Create Super Admin
This is a one-time setup endpoint that does not require an existing token.
- `POST /api/auth/super-admin`
- Body: `{ "username": "admin@demo.com", "password": "Admin123" }`

### Login
- `POST /api/auth/login`
- Returns a JWT token and user profile.

### Teacher/Student Signup
Teachers and Students can only sign up if their email has already been added to the system by an Admin.
- `POST /api/auth/signup/teacher`
- `POST /api/auth/signup/student`

---

## 3) Main API Modules

All protected routes require an `Authorization: Bearer <token>` header.

| Module | Base Path | Description |
|--------|-----------|-------------|
| **Students** | `/api/students` | CRUD for student records and metadata. |
| **Teachers** | `/api/teachers` | CRUD for teacher profiles, experience, and education. |
| **Classes** | `/api/classes` | Define subjects and class levels. |
| **Schedules** | `/api/class-schedules` | Set days and times for specific classes. |
| **Enrollments** | `/api/enrollments` | Manage which students are in which classes. |
| **Payments** | `/api/payments` | Record tuition fees and check arrears. |
| **Attendance** | `/api/attendance` | Record and query attendance logs. |
| **Scores** | `/api/scores` | Record term marks (G9-11) for students. |
| **Public** | `/api/guest` | Publicly accessible class and teacher info. |

---

## 4) Project Structure

- `src/models/`: Mongoose schemas for all entities.
- `src/routes/`: Express route definitions.
- `src/controllers/`: Business logic implementations.
- `src/utils/`: Middleware (auth, validation) and helpers.
- `src/server.js`: Entrance point and server configuration.
