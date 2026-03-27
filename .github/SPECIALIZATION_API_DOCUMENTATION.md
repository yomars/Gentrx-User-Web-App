# Specialization API Documentation

## Base URL
```
/api/v1
```

## Endpoints Overview

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/add_specialization` | Create a new specialization | Required |
| POST | `/update_specialization` | Update existing specialization | Required |
| POST | `/delete_specialization` | Delete a specialization | Required |
| GET | `/get_specialization` | Get all specializations | Not Required |
| GET | `/get_specialization/{id}` | Get specialization by ID | Not Required |

---

## 1. Create Specialization

Create a new medical specialization in the system.

### Endpoint
```
POST /api/v1/add_specialization
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Specialization title (must be unique) |
| image | file | No | Specialization icon/image file |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('title', 'Cardiology');
formData.append('image', imageFile); // File object

const response = await fetch('/api/v1/add_specialization', {
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
  "id": 15
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
interface AddSpecializationRequest {
  title: string;
  image?: File;
}

interface AddSpecializationResponse {
  response: number;
  message: string;
  id?: number;
}
```

### Notes
- Specialization title must be unique across the system
- Image is optional but recommended for better UI
- Image stored in `specialization/` directory

---

## 2. Update Specialization

Update an existing specialization's information.

### Endpoint
```
POST /api/v1/update_specialization
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Specialization ID to update |
| title | string | No | New specialization title (must be unique) |
| image | file | No | New specialization image file |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('id', '15');
formData.append('title', 'Cardiovascular Medicine');
formData.append('image', newImageFile); // File object

const response = await fetch('/api/v1/update_specialization', {
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
interface UpdateSpecializationRequest {
  id: number;
  title?: string;
  image?: File;
}

interface UpdateSpecializationResponse {
  response: number;
  message: string;
}
```

### Notes
- All parameters except `id` are optional
- When updating image, the old image is automatically deleted
- Only provide parameters you want to update

---

## 3. Delete Specialization

Delete a specialization from the system.

### Endpoint
```
POST /api/v1/delete_specialization
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Specialization ID to delete |

### Request Example (JSON)
```typescript
const response = await fetch('/api/v1/delete_specialization', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 15
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
interface DeleteSpecializationRequest {
  id: number;
}

interface DeleteSpecializationResponse {
  response: number;
  message: string;
}
```

### Notes
- Associated image is automatically deleted upon successful deletion
- If specialization is linked to doctors, deletion may fail
- Consider implementing soft delete or deactivation for production use

---

## 4. Get All Specializations

Retrieve all specializations in the system.

### Endpoint
```
GET /api/v1/get_specialization
```

### Headers
```
Content-Type: application/json
```

### Request Parameters
No parameters required.

### Request Example
```typescript
const response = await fetch('/api/v1/get_specialization', {
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
      "image": "specialization/cardiology_icon_123.png",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    },
    {
      "id": 2,
      "title": "Neurology",
      "image": "specialization/neurology_icon_456.png",
      "created_at": "2024-01-16 14:20:00",
      "updated_at": "2024-01-16 14:20:00"
    },
    {
      "id": 3,
      "title": "Orthopedics",
      "image": null,
      "created_at": "2024-01-17 09:15:00",
      "updated_at": "2024-01-17 09:15:00"
    }
  ]
}
```

### TypeScript Interface
```typescript
interface Specialization {
  id: number;
  title: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

interface GetSpecializationsResponse {
  response: number;
  data: Specialization[];
}
```

### Notes
- Returns all specializations without pagination
- Useful for dropdown lists and filters
- Image field may be null if no image was uploaded

---

## 5. Get Specialization by ID

Retrieve a specific specialization by its ID.

### Endpoint
```
GET /api/v1/get_specialization/{id}
```

### Headers
```
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Specialization ID |

### Request Example
```typescript
const specializationId = 15;
const response = await fetch(`/api/v1/get_specialization/${specializationId}`, {
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
    "image": "specialization/cardiology_icon_123.png",
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
interface Specialization {
  id: number;
  title: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

interface GetSpecializationByIdResponse {
  response: number;
  data: Specialization | null;
}
```

---

## Common Data Types

### Specialization Object
```typescript
interface Specialization {
  id: number;
  title: string;
  image: string | null;
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
| `title already exists` | A specialization with this title already exists |
| `error` | Generic server error occurred |

### HTTP Status Codes
- `200` - Success (even for logical errors, check response.response field)
- `400` - Validation error (missing required parameters)

---

## Image Handling

### Image Upload
- Images are uploaded as multipart/form-data
- Stored in the `specialization/` directory
- Old images are automatically deleted when updating

### Image URL
Images are stored relative to the storage path. To display:
```typescript
const imageUrl = `${baseStorageUrl}/${specialization.image}`;
```

### Recommended Image Specifications
- Format: PNG, JPG, or SVG (SVG preferred for icons)
- Size: Square aspect ratio (e.g., 256x256, 512x512)
- File size: Under 500KB for optimal performance

---

## React/TypeScript Usage Example

### Complete CRUD Service
```typescript
// types/specialization.ts
export interface Specialization {
  id: number;
  title: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  response: number;
  data?: T;
  message?: string;
  id?: number;
}

// services/specializationService.ts
import axios from 'axios';
import { Specialization, ApiResponse } from '../types/specialization';

const API_BASE_URL = '/api/v1';

class SpecializationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async getAllSpecializations(): Promise<Specialization[]> {
    const response = await axios.get<ApiResponse<Specialization[]>>(
      `${API_BASE_URL}/get_specialization`
    );
    return response.data.data || [];
  }

  async getSpecializationById(id: number): Promise<Specialization | null> {
    const response = await axios.get<ApiResponse<Specialization>>(
      `${API_BASE_URL}/get_specialization/${id}`
    );
    return response.data.data || null;
  }

  async createSpecialization(
    title: string,
    image?: File
  ): Promise<{ success: boolean; id?: number; message?: string }> {
    const formData = new FormData();
    formData.append('title', title);
    if (image) formData.append('image', image);

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/add_specialization`,
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

  async updateSpecialization(
    id: number,
    updates: {
      title?: string;
      image?: File;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const formData = new FormData();
    formData.append('id', id.toString());
    if (updates.title) formData.append('title', updates.title);
    if (updates.image) formData.append('image', updates.image);

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/update_specialization`,
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

  async deleteSpecialization(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/delete_specialization`,
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

export const specializationService = new SpecializationService();
```

### React Component Example - List View
```typescript
// components/SpecializationList.tsx
import React, { useState, useEffect } from 'react';
import { specializationService } from '../services/specializationService';
import { Specialization } from '../types/specialization';

const SpecializationList: React.FC = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      const data = await specializationService.getAllSpecializations();
      setSpecializations(data);
      setError(null);
    } catch (err) {
      setError('Failed to load specializations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this specialization?')) {
      return;
    }

    try {
      const result = await specializationService.deleteSpecialization(id);
      if (result.success) {
        alert('Specialization deleted successfully');
        loadSpecializations();
      } else {
        alert(result.message || 'Failed to delete specialization');
      }
    } catch (err) {
      alert('An error occurred while deleting the specialization');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="specialization-list">
      <h2>Specializations</h2>
      <div className="specializations-grid">
        {specializations.map((spec) => (
          <div key={spec.id} className="specialization-card">
            {spec.image && (
              <img
                src={`${process.env.REACT_APP_STORAGE_URL}/${spec.image}`}
                alt={spec.title}
                className="specialization-icon"
              />
            )}
            <h3>{spec.title}</h3>
            <div className="card-actions">
              <button onClick={() => handleDelete(spec.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecializationList;
```

### React Component Example - Create/Edit Form
```typescript
// components/SpecializationForm.tsx
import React, { useState, useEffect } from 'react';
import { specializationService } from '../services/specializationService';

interface SpecializationFormProps {
  specializationId?: number;
  onSuccess?: () => void;
}

const SpecializationForm: React.FC<SpecializationFormProps> = ({ 
  specializationId, 
  onSuccess 
}) => {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!specializationId;

  useEffect(() => {
    if (specializationId) {
      loadSpecialization();
    }
  }, [specializationId]);

  const loadSpecialization = async () => {
    if (!specializationId) return;
    
    try {
      const data = await specializationService.getSpecializationById(specializationId);
      if (data) {
        setTitle(data.title);
        if (data.image) {
          setImagePreview(`${process.env.REACT_APP_STORAGE_URL}/${data.image}`);
        }
      }
    } catch (err) {
      console.error('Failed to load specialization', err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      
      if (isEditMode && specializationId) {
        result = await specializationService.updateSpecialization(specializationId, {
          title,
          image: image || undefined,
        });
      } else {
        result = await specializationService.createSpecialization(title, image || undefined);
      }

      if (result.success) {
        alert(
          isEditMode 
            ? 'Specialization updated successfully!' 
            : `Specialization created successfully! ID: ${result.id}`
        );
        
        // Reset form
        if (!isEditMode) {
          setTitle('');
          setImage(null);
          setImagePreview(null);
        }
        
        onSuccess?.();
      } else {
        alert(result.message || 'Operation failed');
      }
    } catch (err) {
      alert('An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="specialization-form">
      <h2>{isEditMode ? 'Edit Specialization' : 'Create New Specialization'}</h2>
      
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g., Cardiology"
        />
      </div>

      <div className="form-group">
        <label htmlFor="image">Icon/Image</label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
          </div>
        )}
      </div>

      <button type="submit" disabled={loading}>
        {loading 
          ? 'Processing...' 
          : isEditMode 
            ? 'Update Specialization' 
            : 'Create Specialization'
        }
      </button>
    </form>
  );
};

export default SpecializationForm;
```

### React Hook Example
```typescript
// hooks/useSpecializations.ts
import { useState, useEffect } from 'react';
import { specializationService } from '../services/specializationService';
import { Specialization } from '../types/specialization';

export const useSpecializations = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      const data = await specializationService.getAllSpecializations();
      setSpecializations(data);
      setError(null);
    } catch (err) {
      setError('Failed to load specializations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecializations();
  }, []);

  const createSpecialization = async (title: string, image?: File) => {
    const result = await specializationService.createSpecialization(title, image);
    if (result.success) {
      await loadSpecializations(); // Reload list
    }
    return result;
  };

  const updateSpecialization = async (
    id: number, 
    updates: { title?: string; image?: File }
  ) => {
    const result = await specializationService.updateSpecialization(id, updates);
    if (result.success) {
      await loadSpecializations(); // Reload list
    }
    return result;
  };

  const deleteSpecialization = async (id: number) => {
    const result = await specializationService.deleteSpecialization(id);
    if (result.success) {
      await loadSpecializations(); // Reload list
    }
    return result;
  };

  return {
    specializations,
    loading,
    error,
    refresh: loadSpecializations,
    create: createSpecialization,
    update: updateSpecialization,
    delete: deleteSpecialization,
  };
};

// Usage in component:
// const { specializations, loading, error, create, update, delete } = useSpecializations();
```

### Dropdown Select Component
```typescript
// components/SpecializationSelect.tsx
import React, { useEffect, useState } from 'react';
import { specializationService } from '../services/specializationService';
import { Specialization } from '../types/specialization';

interface SpecializationSelectProps {
  value?: number;
  onChange: (specializationId: number) => void;
  required?: boolean;
  className?: string;
}

const SpecializationSelect: React.FC<SpecializationSelectProps> = ({
  value,
  onChange,
  required = false,
  className = ''
}) => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    try {
      const data = await specializationService.getAllSpecializations();
      setSpecializations(data);
    } catch (err) {
      console.error('Failed to load specializations', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <select disabled><option>Loading...</option></select>;
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      required={required}
      className={className}
    >
      <option value="">Select Specialization</option>
      {specializations.map((spec) => (
        <option key={spec.id} value={spec.id}>
          {spec.title}
        </option>
      ))}
    </select>
  );
};

export default SpecializationSelect;
```

---

## Integration with Other Modules

### Relationship with Doctors
Specializations are used in the Doctor module:
```typescript
// When creating a doctor
const doctorData = {
  // ... other fields
  specialization: selectedSpecializationId, // Links to specialization.id
};
```

### Filtering Doctors by Specialization
```typescript
// Get doctors filtered by specialization
const getDoctorsBySpecialization = async (specializationId: number) => {
  const response = await fetch(
    `/api/v1/get_doctor?specialization=${specializationId}`
  );
  return response.json();
};
```

---

## Notes and Best Practices

1. **Authentication**: POST endpoints requiring authentication use Laravel Sanctum tokens. Include the Bearer token in the Authorization header.

2. **File Uploads**: When uploading files, use `FormData` and set `Content-Type: multipart/form-data`.

3. **Response Codes**: The API returns HTTP 200 for most responses. Check the `response` field in the JSON body:
   - `200` = Success
   - `400` = Error/Failure

4. **Image Storage**: Images are stored in the `storage/app/public/specialization/` directory. Make sure to configure your storage link properly:
   ```bash
   php artisan storage:link
   ```

5. **Unique Constraint**: Specialization titles must be unique across the system.

6. **Image Management**: Old images are automatically deleted when:
   - Updating a specialization with a new image
   - Deleting a specialization

7. **Error Messages**: Always check the `message` field in error responses for user-friendly error descriptions.

8. **Date Format**: All timestamps use the format `YYYY-MM-DD HH:mm:ss`.

9. **Caching**: Consider implementing client-side caching for specializations as they typically don't change frequently:
   ```typescript
   // Cache specializations in localStorage
   const CACHE_KEY = 'specializations_cache';
   const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
   
   const getCachedSpecializations = () => {
     const cached = localStorage.getItem(CACHE_KEY);
     if (cached) {
       const { data, timestamp } = JSON.parse(cached);
       if (Date.now() - timestamp < CACHE_DURATION) {
         return data;
       }
     }
     return null;
   };
   
   const setCachedSpecializations = (data: Specialization[]) => {
     localStorage.setItem(CACHE_KEY, JSON.stringify({
       data,
       timestamp: Date.now()
     }));
   };
   ```

10. **Icon Libraries**: If not using custom images, consider using icon libraries like Font Awesome or Material Icons for consistency.

11. **Validation**: Implement client-side validation to ensure title length and format before submission.

12. **Image Optimization**: Consider implementing image optimization on upload:
    - Resize large images
    - Convert to WebP format for better performance
    - Generate thumbnails if needed

13. **Accessibility**: When displaying specialization images, always include meaningful alt text:
    ```tsx
    <img src={imageUrl} alt={`${specialization.title} icon`} />
    ```

14. **Search and Filter**: If you have many specializations, implement search functionality in your UI:
    ```typescript
    const filteredSpecializations = specializations.filter(spec =>
      spec.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    ```

---

## Common Use Cases

### 1. Doctor Registration Form
```typescript
// Use SpecializationSelect in doctor registration
<SpecializationSelect
  value={doctorFormData.specialization}
  onChange={(id) => setDoctorFormData({ ...doctorFormData, specialization: id })}
  required
/>
```

### 2. Search/Filter Interface
```typescript
// Filter doctors by specialization
const [selectedSpecialization, setSelectedSpecialization] = useState<number>();

<SpecializationSelect
  value={selectedSpecialization}
  onChange={setSelectedSpecialization}
/>
```

### 3. Admin Dashboard
```typescript
// Display specialization statistics
const getSpecializationStats = async (specializationId: number) => {
  const doctors = await getDoctorsBySpecialization(specializationId);
  return {
    totalDoctors: doctors.length,
    activeDoctors: doctors.filter(d => d.active === 1).length
  };
};
```

---

## Changelog

- **2024-01-15**: Initial API documentation created
- Covers all Specialization CRUD operations
- Includes TypeScript interfaces and React examples
- Complete service layer implementation
- Custom hooks and reusable components
