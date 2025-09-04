# نظام إدارة المشاريع الإنشائية باللغة العربية

## Overview
A comprehensive construction project management system designed for the Middle East, featuring a full Arabic interface. Its primary purpose is to provide advanced financial management tools, accurate data tracking, and responsive design optimized for mobile. The system integrates advanced features including QR scanning for tools, AI-powered predictive maintenance dashboard, tool location tracking, smart notifications for maintenance and warranty, and intelligent recommendations. The system ensures 100% synchronization between local and deployed versions with all 47 database tables and 7 advanced systems fully operational.

## User Preferences
- **اللغة**: العربية في جميع الردود والملاحظات
- **التوجه**: RTL support كامل
- **التصميم**: Material Design مع ألوان مناسبة للثقافة العربية
- **التواصل**: استخدام اللغة العربية في جميع التفاعلات والتوجيهات
- **طريقة التطوير**: العمل المستقل والشامل مع حلول مفصلة باللغة العربية

## System Architecture

### Frontend
- **Technology Stack**: React.js with TypeScript, Tailwind CSS with shadcn/ui, React Query, Wouter, React Hook Form with Zod.
- **UI/UX Decisions**: Full RTL (Right-to-Left) support, bottom navigation with a floating add button, consistent Material Design principles, optimized screen space, and culturally appropriate color schemes.
- **Core Features**: Dashboard, Projects, Workers, Worker Attendance, Daily Expenses, Material Purchase, Tools Management, and Reports.
- **Advanced Features**: QR Scanner for tools, Advanced Analytics Dashboard, AI Predictive Maintenance, Tool Location Tracking, Smart Maintenance/Warranty Notifications, Intelligent Recommendations Engine, Smart Performance Optimizer, and an Advanced Notification System.

### Backend
- **Technology Stack**: Express.js with TypeScript.
- **API**: RESTful APIs with robust validation.
- **Authentication**: JWT-based authentication for secure session management.
- **Core Functionality**: Project management (create, edit, delete, track status), worker management (registration, wage tracking, attendance, remittances), financial management (fund transfers, expenses, purchases, supplier accounts), and comprehensive reporting with Excel/PDF export.
- **Security**: Bcrypt encryption (SALT_ROUNDS = 12), SQL injection protection via Drizzle ORM, secure session management, Zod schema validation, and an automated secret key management system.
- **Smart System**: Integrated intelligent features for data analysis and generating smart decisions and recommendations.
- **Error Tracking**: Advanced, dedicated error tracking system with detailed logging, system health checks, and specific solutions for errors like 502/504, including Netlify integration.

### Database
- **Technology**: Supabase PostgreSQL with Drizzle ORM.
- **Schema**: A comprehensive schema with 47 tables, including `users`, `projects`, `workers`, `worker_attendance`, `fund_transfers`, `material_purchases`, `transportation_expenses`, `worker_transfers`, `suppliers`, `supplier_payments`, `notification_read_states`, and 9 dedicated tables for advanced authentication and security.

### Mobile Application
- **Technology Stack**: React Native with Expo 52.0, TypeScript, React Navigation.
- **Functionality**: 100% identical to the web application in features and design, including RTL support and Arabic UI.
- **Screens**: 26 screens covering all main and sub-screens (e.g., Dashboard, Projects, Workers, Suppliers, Daily Expenses, Material Purchase).
- **Data Synchronization**: Direct connection to the same Supabase database, ensuring real-time synchronization with the web application.

### Secret Key Management System
- **Functionality**: Automatically checks for and adds missing required secret keys (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY) at server startup, ensuring secure values are always present.

### General Improvements
- **API Robustness**: Enhanced error handling with `try-catch`, `Array.isArray()` checks, support for multiple API response structures, and optimized performance with `staleTime`, `retry`, and `refetchInterval`.
- **Deployment Reliability**: Critical fixes for Vercel routing and CORS issues, ensuring production stability and correct API endpoint resolution.
- **Date Handling**: Robust functions for safe date formatting, validation, and comparison to prevent "Invalid Date" errors.
- **Code Quality**: Achieved zero LSP diagnostics and perfect TypeScript compliance across the codebase.

## External Dependencies
- **Database**: Supabase PostgreSQL
- **Frontend Libraries**: React.js, TypeScript, Tailwind CSS, shadcn/ui, React Query (@tanstack/react-query), Wouter, React Hook Form, Zod
- **Backend Libraries**: Express.js, TypeScript, Drizzle ORM, jsonwebtoken, bcrypt
- **Mobile Libraries**: React Native, Expo SDK, @supabase/supabase-js, @react-native-async-storage/async-storage, speakeasy
- **Export Libraries**: ExcelJS, jsPDF
- **Build Tools**: Vite (web), EAS Build (mobile)
- **Security & Utilities**: crypto (Node.js built-in), dotenv