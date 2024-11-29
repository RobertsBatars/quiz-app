# AI-Powered Quiz Platform

An advanced quiz platform that uses AI to automatically generate quizzes from uploaded documents. Features multiple quiz types, AI grading, and comprehensive admin tools.

## Features

- **Document Processing**
  - Support for PDF and Word documents
  - AI-powered content extraction and analysis
  - Vector embeddings for semantic search
  - Automated content moderation

- **Quiz Types**
  - Multiple choice (4 options)
  - Open-ended with AI grading
  - Flashcards with hints
  - Oral exams with recording

- **Admin Features**
  - User management
  - Content moderation
  - Analytics dashboard
  - PDF report generation

- **Security**
  - Role-based access control
  - Account protection
  - API route security
  - Content moderation

## Getting Started

1. **Clone and Install**
   ```bash
   git clone github.com/RobertsBatars/quiz-app
   cd quiz-app
   npm install
   ```

2. **Environment Setup**
   Create a `.env.local` file with:
   ```
   OPENAI_API_KEY=your-api-key
   MONGODB_URI=your-mongodb-uri
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Database Setup**
   ```bash
   npm run update-db
   ```

4. **Development**
   ```bash
   npm run dev
   ```


## Project Structure

- `/app` - Next.js routes and pages
- `/components` - Reusable UI components
- `/lib` - Utility functions
- `/models` - MongoDB schemas
- `/scripts` - Build and setup scripts
- `/types` - TypeScript definitions

## API Documentation

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/session` - Get session

### Documents
- POST `/api/documents/upload` - Upload document
- GET `/api/documents` - List documents
- GET `/api/documents/:id` - Get document
- DELETE `/api/documents/:id` - Delete document

### Quizzes
- POST `/api/quizzes` - Create quiz
- GET `/api/quizzes` - List quizzes
- GET `/api/quizzes/:id` - Get quiz
- PUT `/api/quizzes/:id` - Update quiz
- DELETE `/api/quizzes/:id` - Delete quiz

### Admin
- GET `/api/admin/users` - List users
- PUT `/api/admin/users/:id` - Update user
- GET `/api/admin/analytics` - Get analytics
- GET `/api/admin/reports` - Generate reports

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
