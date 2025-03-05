# Postply Frontend

This is the frontend application for the Postply educational platform, built with React, TypeScript, and Material-UI.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
cd /home/kali2/postply/apps/frontend
npm install
```

2. Start the development server:

```bash
npm start
```

The application will be available at http://localhost:3000.

## Project Structure

```
/src
  /components       # Reusable UI components
    /layouts        # Layout components
  /context          # React context providers
  /pages            # Page components
    /auth           # Authentication pages
    /dashboard      # Dashboard pages
    /classes        # Class-related pages
    /profile        # User profile pages
  /services         # API service functions
  /types            # TypeScript type definitions
  /utils            # Utility functions
  App.tsx           # Main application component
  index.tsx         # Application entry point
  theme.ts          # Material-UI theme configuration
```

## Features

- Authentication (login/register)
- User dashboard (student/teacher views)
- Class listing and details
- User profile management
- Responsive design

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
REACT_APP_API_URL=http://localhost:3000/api
```

## Available Scripts

- `npm start`: Starts the development server
- `npm build`: Builds the app for production
- `npm test`: Runs tests
- `npm eject`: Ejects from Create React App

## Dependencies

- React
- TypeScript
- Material-UI
- React Router
- Formik & Yup
- Axios
- React Query
