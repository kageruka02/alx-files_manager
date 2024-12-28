# File Manager API

This project implements a file management system with RESTful API endpoints for handling file uploads, retrieval, and management, using Express and MongoDB. The system allows users to upload files, create folders, store files on disk, and manage file metadata in a MongoDB database.

## Features

- **File Upload**: Users can upload files, images, and folders. Files are stored both in the database and on disk.
- **File Management**: Allows users to list files, retrieve specific files, and categorize them under folders.
- **File Publishing**: Users can set files as public or private using the publish/unpublish functionality.
- **Authentication**: Endpoints are protected with token-based authentication, ensuring that users can only interact with their own files.

## Endpoints

### POST `/files`
- **Description**: Upload a new file to the system.
- **Request Body**:
  - `name`: Filename (string) - required
  - `type`: Type of file, can be "file", "folder", or "image" (string) - required
  - `parentId`: ID of the parent folder (optional, default is 0 for root)
  - `isPublic`: Boolean to define if the file is public (optional, default is `false`)
  - `data`: Base64-encoded content of the file (required for type "file" or "image")
- **Response**: Returns the file document with metadata (ID, name, type, isPublic, etc.)
- **Error Handling**:
  - Missing `name` -> 400 Missing name
  - Missing `type` or invalid type -> 400 Missing type
  - Missing `data` if type is not `folder` -> 400 Missing data
  - Invalid `parentId` -> 400 Parent not found or Parent is not a folder

### GET `/files/:id`
- **Description**: Retrieve a specific file based on its ID.
- **Response**: Returns the file document if the user owns it, otherwise 404 Not found.
- **Error Handling**:
  - Unauthorized access -> 401 Unauthorized
  - File not found -> 404 Not found

### GET `/files`
- **Description**: List all files belonging to the authenticated user, with pagination and optional `parentId` filter.
- **Query Parameters**:
  - `parentId`: The parent folder ID (optional, default is `0`)
  - `page`: The page number for pagination (default is 0, starting from the first page)
- **Response**: Returns a list of file documents.
- **Error Handling**:
  - Unauthorized access -> 401 Unauthorized

### PUT `/files/:id/publish`
- **Description**: Set the file as public.
- **Response**: Returns the updated file document with `isPublic: true`.
- **Error Handling**:
  - Unauthorized access -> 401 Unauthorized
  - File not found -> 404 Not found

### PUT `/files/:id/unpublish`
- **Description**: Set the file as private.
- **Response**: Returns the updated file document with `isPublic: false`.
- **Error Handling**:
  - Unauthorized access -> 401 Unauthorized
  - File not found -> 404 Not found

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance running locally or remotely
- Redis (optional, if using caching)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repository-name/file-manager-api.git
   cd file-manager-api
2. npm install
3. npm run start-server
