# HomeSpace - Backend API

## Project Description
The HomeSpace Backend is a robust, scalable RESTful API designed to power a comprehensive hostel booking ecosystem. It handles complex business logic, including role-based access control (RBAC), real-time communication, secure financial transactions, and automated property management tasks. The system ensures data integrity and security for students, property owners, and administrators.

## Stack Used
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: PostgreSQL
*   **ORM**: Sequelize
*   **Real-time**: Socket.io
*   **File Storage**: Cloudinary (Image hosting)
*   **Payments**: Khalti Payment Gateway Integration
*   **Task Scheduling**: node-cron (for automated booking expiry)
*   **Security**: JWT (JSON Web Tokens), bcryptjs, and express-validator

## Key Features
*   **Role-Based Access Control**: Granular permissions for Students, Owners, and Admins.
*   **Advanced Authentication**: Secure login/registration with OTP-based email verification.
*   **Hostel & Room Management**: Full CRUD operations with image upload support.
*   **Real-time Chat**: Direct messaging between students and property owners.
*   **Automated Booking System**: Logic for handling requested, approved, and expired bookings.
*   **Secure Payments**: Integration with Khalti for deposit and full payment processing.
*   **Notification Engine**: Internal and email notifications for critical system events.
*   **Analytical Engine**: Data aggregation for dashboard charts and metrics.
