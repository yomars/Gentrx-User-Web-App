# Department API Documentation

## Base URL
```
/api/v1
```

## Endpoints Overview

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/add_department` | Create a new department | Required |
| POST | `/udpate_department` | Update existing department | Required |
| POST | `/remove_department_image` | Remove department image | Required |
| POST | `/delete_department` | Delete a department | Required |
| GET | `/get_department` | Get all departments | Not Required |
| GET | `/get_department_active` | Get all active departments | Not Required |
| GET | `/get_department/{id}` | Get department by ID | Not Required |

---

## 1. Create Department

Create a new department in the system.

### Endpoint
```
POST /api/v1/add_department
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Department title (must be unique) |
| description | string | No | Department description |
| image | file | No | Department image file |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('title', 'Cardiology');
formData.append('description', 'Heart and cardiovascular care');
formData.append('image', imageFile); // File object

const response = await fetch('/api/v1/add_department', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Success Response (200)
```json
{
  "response": 200,
  "message": "successfully",
  "id": 123
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "response": 400
}
```

#### Duplicate Title Error (200)
```json
{
  "response": 400,
  "message": "title already exists"
}
```

#### Server Error (200)
```json
{
  "response": 400,
  "message": "error"
}
```

### TypeScript Interface
```typescript
interface AddDepartmentRequest {
  title: string;
  description?: string;
  image?: File;
}

interface AddDepartmentResponse {
  response: number;
  message: string;
  id?: number;
}
```

---

## 2. Update Department

Update an existing department's information.

### Endpoint
```
POST /api/v1/udpate_department
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Department ID to update |
| title | string | No | New department title (must be unique) |
| description | string | No | New department description |
| active | integer | No | Active status (0 = inactive, 1 = active) |
| image | file | No | New department image file |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('id', '123');
formData.append('title', 'Cardiology Department');
formData.append('description', 'Updated description');
formData.append('active', '1');
formData.append('image', newImageFile); // File object

const response = await fetch('/api/v1/udpate_department', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Success Response (200)
```json
{
  "response": 200,
  "message": "successfully"
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "response": 400
}
```

#### Duplicate Title Error (200)
```json
{
  "response": 400,
  "message": "title already exists"
}
```

#### Server Error (200)
```json
{
  "response": 400,
  "message": "error"
}
```

### TypeScript Interface
```typescript
interface UpdateDepartmentRequest {
  id: number;
  title?: string;
  description?: string;
  active?: 0 | 1;
  image?: File;
}

interface UpdateDepartmentResponse {
  response: number;
  message: string;
}
```

### Notes
- When updating image, the old image will be automatically deleted (except default image "def.png")
- All parameters except `id` are optional
- Only provide parameters you want to update

---

## 3. Remove Department Image

Remove the image from a department.

### Endpoint
```
POST /api/v1/remove_department_image
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Department ID |

### Request Example (JSON)
```typescript
const response = await fetch('/api/v1/remove_department_image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 123
  })
});
```

### Success Response (200)
```json
{
  "response": 200,
  "message": "successfully"
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "response": 400
}
```

#### Server Error (200)
```json
{
  "response": 400,
  "message": "error"
}
```

### TypeScript Interface
```typescript
interface RemoveDepartmentImageRequest {
  id: number;
}

interface RemoveDepartmentImageResponse {
  response: number;
  message: string;
}
```

### Notes
- Default image "def.png" will not be deleted
- Image field will be set to null after removal

---

## 4. Delete Department

Delete a department from the system.

### Endpoint
```
POST /api/v1/delete_department
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Department ID to delete |

### Request Example (JSON)
```typescript
const response = await fetch('/api/v1/delete_department', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 123
  })
});
```

### Success Response (200)
```json
{
  "response": 200,
  "message": "successfully Deleted"
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "response": 400
}
```

#### Foreign Key Constraint Error (200)
```json
{
  "response": 400,
  "message": "This record cannot be deleted because it is linked to multiple data entries in the system. You can only deactivate it to prevent future use."
}
```

#### Server Error (200)
```json
{
  "response": 400,
  "message": "error"
}
```

### TypeScript Interface
```typescript
interface DeleteDepartmentRequest {
  id: number;
}

interface DeleteDepartmentResponse {
  response: number;
  message: string;
}
```

### Notes
- If department is linked to other records (doctors, appointments, etc.), deletion will fail
- In such cases, deactivate the department instead using the update endpoint with `active: 0`
- Associated image will be deleted upon successful deletion

---

## 5. Get All Departments

Retrieve all departments in the system.

### Endpoint
```
GET /api/v1/get_department
```

### Headers
```
Content-Type: application/json
```

### Request Parameters
No parameters required.

### Request Example
```typescript
const response = await fetch('/api/v1/get_department', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### Success Response (200)
```json
{
  "response": 200,
  "data": [
    {
      "id": 1,
      "title": "Cardiology",
      "description": "Heart and cardiovascular care",
      "image": "department/cardiology_image_123.jpg",
      "active": 1,
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    },
    {
      "id": 2,
      "title": "Neurology",
      "description": "Brain and nervous system care",
      "image": null,
      "active": 1,
      "created_at": "2024-01-16 14:20:00",
      "updated_at": "2024-01-16 14:20:00"
    }
  ]
}
```

### TypeScript Interface
```typescript
interface Department {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

interface GetDepartmentsResponse {
  response: number;
  data: Department[];
}
```

---

## 6. Get Active Departments

Retrieve only active departments.

### Endpoint
```
GET /api/v1/get_department_active
```

### Headers
```
Content-Type: application/json
```

### Request Parameters
No parameters required.

### Request Example
```typescript
const response = await fetch('/api/v1/get_department_active', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### Success Response (200)
```json
{
  "response": 200,
  "data": [
    {
      "id": 1,
      "title": "Cardiology",
      "description": "Heart and cardiovascular care",
      "image": "department/cardiology_image_123.jpg",
      "active": 1,
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    },
    {
      "id": 2,
      "title": "Neurology",
      "description": "Brain and nervous system care",
      "image": null,
      "active": 1,
      "created_at": "2024-01-16 14:20:00",
      "updated_at": "2024-01-16 14:20:00"
    }
  ]
}
```

### TypeScript Interface
```typescript
interface Department {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  active: 1; // Always 1 for this endpoint
  created_at: string;
  updated_at: string;
}

interface GetActiveDepartmentsResponse {
  response: number;
  data: Department[];
}
```

### Notes
- Only returns departments where `active = 1`
- Useful for dropdown lists and public-facing pages

---

## 7. Get Department by ID

Retrieve a specific department by its ID.

### Endpoint
```
GET /api/v1/get_department/{id}
```

### Headers
```
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Department ID |

### Request Example
```typescript
const departmentId = 123;
const response = await fetch(`/api/v1/get_department/${departmentId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### Success Response (200)
```json
{
  "response": 200,
  "data": {
    "id": 1,
    "title": "Cardiology",
    "description": "Heart and cardiovascular care",
    "image": "department/cardiology_image_123.jpg",
    "active": 1,
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-15 10:30:00"
  }
}
```

### Response When Not Found
```json
{
  "response": 200,
  "data": null
}
```

### TypeScript Interface
```typescript
interface Department {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

interface GetDepartmentByIdResponse {
  response: number;
  data: Department | null;
}
```

---

## Common Data Types

### Department Object
```typescript
interface Department {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  active: 0 | 1;
  created_at: string; // Format: "YYYY-MM-DD HH:mm:ss"
  updated_at: string; // Format: "YYYY-MM-DD HH:mm:ss"
}
```

---

## Error Handling

### Standard Error Response
All endpoints return errors in the following format:
```json
{
  "response": 400,
  "message": "error message here"
}
```

### Common Error Messages

| Message | Meaning |
|---------|---------|
| `title already exists` | A department with this title already exists |
| `error` | Generic server error occurred |
| `This record cannot be deleted...` | Department is linked to other records |

### HTTP Status Codes
- `200` - Success (even for logical errors, check response.response field)
- `400` - Validation error (missing required parameters)

---

## Image Handling

### Image Upload
- Images are uploaded as multipart/form-data
- Stored in the `department/` directory
- Old images are automatically deleted when updating (except "def.png")

### Image URL
Images are stored relative to the storage path. To display:
```typescript
const imageUrl = `${baseStorageUrl}/${department.image}`;
```

### Default Image
- Default image identifier: `"def.png"`
- Not deleted when removing/updating images

---

## React/TypeScript Usage Example

### Complete CRUD Service
```typescript
// types/department.ts
export interface Department {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  response: number;
  data?: T;
  message?: string;
  id?: number;
}

// services/departmentService.ts
import axios from 'axios';
import { Department, ApiResponse } from '../types/department';

const API_BASE_URL = '/api/v1';

class DepartmentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async getAllDepartments(): Promise<Department[]> {
    const response = await axios.get<ApiResponse<Department[]>>(
      `${API_BASE_URL}/get_department`
    );
    return response.data.data || [];
  }

  async getActiveDepartments(): Promise<Department[]> {
    const response = await axios.get<ApiResponse<Department[]>>(
      `${API_BASE_URL}/get_department_active`
    );
    return response.data.data || [];
  }

  async getDepartmentById(id: number): Promise<Department | null> {
    const response = await axios.get<ApiResponse<Department>>(
      `${API_BASE_URL}/get_department/${id}`
    );
    return response.data.data || null;
  }

  async createDepartment(
    title: string,
    description?: string,
    image?: File
  ): Promise<{ success: boolean; id?: number; message?: string }> {
    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (image) formData.append('image', image);

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/add_department`,
      formData,
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return {
      success: response.data.response === 200,
      id: response.data.id,
      message: response.data.message
    };
  }

  async updateDepartment(
    id: number,
    updates: {
      title?: string;
      description?: string;
      active?: 0 | 1;
      image?: File;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const formData = new FormData();
    formData.append('id', id.toString());
    if (updates.title) formData.append('title', updates.title);
    if (updates.description !== undefined) formData.append('description', updates.description);
    if (updates.active !== undefined) formData.append('active', updates.active.toString());
    if (updates.image) formData.append('image', updates.image);

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/udpate_department`,
      formData,
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return {
      success: response.data.response === 200,
      message: response.data.message
    };
  }

  async removeDepartmentImage(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/remove_department_image`,
      { id },
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: response.data.response === 200,
      message: response.data.message
    };
  }

  async deleteDepartment(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/delete_department`,
      { id },
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: response.data.response === 200,
      message: response.data.message
    };
  }
}

export const departmentService = new DepartmentService();
```

### React Component Example
```typescript
// components/DepartmentList.tsx
import React, { useState, useEffect } from 'react';
import { departmentService } from '../services/departmentService';
import { Department } from '../types/department';

const DepartmentList: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getActiveDepartments();
      setDepartments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load departments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      const result = await departmentService.deleteDepartment(id);
      if (result.success) {
        alert('Department deleted successfully');
        loadDepartments();
      } else {
        alert(result.message || 'Failed to delete department');
      }
    } catch (err) {
      alert('An error occurred while deleting the department');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="department-list">
      <h2>Departments</h2>
      <div className="departments-grid">
        {departments.map((dept) => (
          <div key={dept.id} className="department-card">
            {dept.image && (
              <img
                src={`${process.env.REACT_APP_STORAGE_URL}/${dept.image}`}
                alt={dept.title}
              />
            )}
            <h3>{dept.title}</h3>
            {dept.description && <p>{dept.description}</p>}
            <button onClick={() => handleDelete(dept.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentList;
```

---

## Notes and Best Practices

1. **Authentication**: Endpoints requiring authentication use Laravel Sanctum tokens. Include the Bearer token in the Authorization header.

2. **File Uploads**: When uploading files, use `FormData` and set `Content-Type: multipart/form-data`.

3. **Response Codes**: The API returns HTTP 200 for most responses. Check the `response` field in the JSON body:
   - `200` = Success
   - `400` = Error/Failure

4. **Image Storage**: Images are stored in the `storage/app/public/department/` directory. Make sure to configure your storage link properly.

5. **Soft Delete Alternative**: Since some departments cannot be deleted due to foreign key constraints, use the `active` field to soft-deactivate departments instead.

6. **Unique Constraint**: Department titles must be unique across the system.

7. **Error Messages**: Always check the `message` field in error responses for user-friendly error descriptions.

8. **Date Format**: All timestamps use the format `YYYY-MM-DD HH:mm:ss`.

---

## Changelog

- **2024-01-15**: Initial API documentation created
- Covers all Department CRUD operations
- Includes TypeScript interfaces and React examples
