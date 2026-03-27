# Doctor API Documentation

## Base URL
```
/api/v1
```

## Endpoints Overview

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/add_doctor` | Create a new doctor | Required |
| POST | `/update_doctor` | Update existing doctor | Required |
| POST | `/remove_doctor_image` | Remove doctor profile image | Required |
| POST | `/delete_doctor` | Delete a doctor | Required |
| GET | `/get_doctor` | Get all doctors with filters & pagination | Not Required |
| GET | `/get_doctor/{id}` | Get doctor by ID with detailed info | Not Required |

---

## 1. Create Doctor

Create a new doctor account with user credentials and professional details.

### Endpoint
```
POST /api/v1/add_doctor
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| f_name | string | Yes | Doctor's first name |
| l_name | string | Yes | Doctor's last name |
| email | string | Yes | Doctor's email (must be unique) |
| password | string | Yes | Account password |
| phone | string | No | Doctor's phone number (must be unique & numeric) |
| isd_code | string | No | International dialing code (e.g., "+1") |
| dob | date | Yes | Date of birth (format: YYYY-MM-DD) |
| gender | string | Yes | Gender (male/female/other) |
| department | integer | Yes | Department ID |
| specialization | integer | Yes | Specialization ID |
| ex_year | integer | Yes | Years of experience |
| clinic_id | integer | Yes | Clinic ID where doctor practices |
| active | integer | Yes | Active status (0 = inactive, 1 = active) |
| description | string | No | Doctor's description/bio |
| room | string | No | Room number/location |
| license_number | string | No | Medical license number |
| ptr_number | string | No | PTR (Prescription Tax Registration) number |
| image | file | No | Doctor's profile image |
| signature | file | No | Doctor's digital signature image |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('f_name', 'John');
formData.append('l_name', 'Doe');
formData.append('email', 'john.doe@example.com');
formData.append('password', 'SecurePass123');
formData.append('phone', '1234567890');
formData.append('isd_code', '+1');
formData.append('dob', '1985-05-15');
formData.append('gender', 'male');
formData.append('department', '1');
formData.append('specialization', '5');
formData.append('ex_year', '10');
formData.append('clinic_id', '3');
formData.append('active', '1');
formData.append('description', 'Experienced cardiologist');
formData.append('room', '201');
formData.append('license_number', 'MED123456');
formData.append('ptr_number', 'PTR789012');
formData.append('image', profileImageFile);
formData.append('signature', signatureImageFile);

const response = await fetch('/api/v1/add_doctor', {
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
  "id": 456
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "response": 400
}
```

#### Duplicate Phone Number (200)
```json
{
  "response": 400,
  "message": "phone number already exists"
}
```

#### Duplicate Email (200)
```json
{
  "response": 400,
  "message": "email id already exists"
}
```

#### Invalid Phone Number (200)
```json
{
  "response": 400,
  "message": "Please enter valid phone number"
}
```

#### Server Error (200)
```json
{
  "response": 400,
  "message": "error $e"
}
```

### TypeScript Interface
```typescript
interface AddDoctorRequest {
  f_name: string;
  l_name: string;
  email: string;
  password: string;
  phone?: string;
  isd_code?: string;
  dob: string; // Format: YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  department: number;
  specialization: number;
  ex_year: number;
  clinic_id: number;
  active: 0 | 1;
  description?: string;
  room?: string;
  license_number?: string;
  ptr_number?: string;
  image?: File;
  signature?: File;
}

interface AddDoctorResponse {
  response: number;
  message: string;
  id?: number;
}
```

### Notes
- Doctor role ID is automatically assigned as 18
- Password is auto-generated if not provided
- Profile image stored in `users/` directory
- Signature stored in `doctors/signatures/` directory
- User account and doctor record are created in a transaction

---

## 2. Update Doctor

Update existing doctor's information including personal details, professional info, and settings.

### Endpoint
```
POST /api/v1/update_doctor
```

### Headers
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Doctor's user ID |
| f_name | string | No | First name |
| l_name | string | No | Last name |
| email | string | No | Email (must be unique) |
| password | string | No | New password |
| phone | string | No | Phone number (must be unique) |
| isd_code | string | No | International dialing code |
| phone_sec | string | No | Secondary phone number |
| isd_code_sec | string | No | Secondary phone ISD code |
| gender | string | No | Gender |
| dob | date | No | Date of birth |
| address | string | No | Address |
| city | string | No | City |
| state | string | No | State |
| postal_code | string | No | Postal code |
| department | integer | No | Department ID |
| specialization | integer | No | Specialization ID |
| ex_year | integer | No | Years of experience |
| description | string | No | Doctor's description |
| room | string | No | Room number |
| active | integer | No | Active status (0/1) |
| license_number | string | No | Medical license number |
| ptr_number | string | No | PTR number |
| zoom_client_id | string | No | Zoom client ID for video calls |
| zoom_secret_id | string | No | Zoom secret ID |
| insta_link | string | No | Instagram profile link |
| fb_linik | string | No | Facebook profile link |
| twitter_link | string | No | Twitter profile link |
| you_tube_link | string | No | YouTube channel link |
| video_appointment | integer | No | Enable video appointments (0/1) |
| clinic_appointment | integer | No | Enable clinic appointments (0/1) |
| emergency_appointment | integer | No | Enable emergency appointments (0/1) |
| opd_fee | decimal | No | OPD consultation fee |
| video_fee | decimal | No | Video consultation fee |
| emg_fee | decimal | No | Emergency consultation fee |
| stop_booking | integer | No | Stop accepting bookings (0/1) |
| image | file | No | New profile image |
| signature | file | No | New signature image |

### Request Example (FormData)
```typescript
const formData = new FormData();
formData.append('id', '456');
formData.append('f_name', 'John');
formData.append('l_name', 'Smith');
formData.append('phone', '9876543210');
formData.append('email', 'john.smith@example.com');
formData.append('description', 'Updated description');
formData.append('opd_fee', '500');
formData.append('video_fee', '400');
formData.append('active', '1');
formData.append('video_appointment', '1');
formData.append('clinic_appointment', '1');
formData.append('stop_booking', '0');
formData.append('image', newProfileImageFile);
formData.append('signature', newSignatureFile);

const response = await fetch('/api/v1/update_doctor', {
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

#### Duplicate Phone/Email (200)
```json
{
  "response": 400,
  "message": "phone number already exists"
}
```
```json
{
  "response": 400,
  "message": "email id already exists"
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
interface UpdateDoctorRequest {
  id: number;
  f_name?: string;
  l_name?: string;
  email?: string;
  password?: string;
  phone?: string;
  isd_code?: string;
  phone_sec?: string;
  isd_code_sec?: string;
  gender?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  department?: number;
  specialization?: number;
  ex_year?: number;
  description?: string;
  room?: string;
  active?: 0 | 1;
  license_number?: string;
  ptr_number?: string;
  zoom_client_id?: string;
  zoom_secret_id?: string;
  insta_link?: string;
  fb_linik?: string;
  twitter_link?: string;
  you_tube_link?: string;
  video_appointment?: 0 | 1;
  clinic_appointment?: 0 | 1;
  emergency_appointment?: 0 | 1;
  opd_fee?: number;
  video_fee?: number;
  emg_fee?: number;
  stop_booking?: 0 | 1;
  image?: File;
  signature?: File;
}

interface UpdateDoctorResponse {
  response: number;
  message: string;
}
```

### Notes
- All parameters except `id` are optional
- Old images/signatures are automatically deleted when updating (except "def.png")
- Only provide parameters you want to update
- Updates are performed in a transaction for data integrity

---

## 3. Remove Doctor Image

Remove the profile image from a doctor's account.

### Endpoint
```
POST /api/v1/remove_doctor_image
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Doctor's user ID |

### Request Example (JSON)
```typescript
const response = await fetch('/api/v1/remove_doctor_image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 456
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
interface RemoveDoctorImageRequest {
  id: number;
}

interface RemoveDoctorImageResponse {
  response: number;
  message: string;
}
```

### Notes
- Default image "def.png" will not be deleted from storage
- Image field will be set to null after removal
- Old custom images are deleted from storage

---

## 4. Delete Doctor

Delete a doctor account and all associated data.

### Endpoint
```
POST /api/v1/delete_doctor
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Doctor's user ID |

### Request Example (JSON)
```typescript
const response = await fetch('/api/v1/delete_doctor', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 456
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

### TypeScript Interface
```typescript
interface DeleteDoctorRequest {
  id: number;
}

interface DeleteDoctorResponse {
  response: number;
  message: string;
}
```

### Notes
- Deletes records from: `users`, `doctors`, `users_role_assign`, `family_members`
- If linked to appointments or other records, deletion will fail
- In such cases, deactivate the doctor instead using `active: 0`
- Profile image is deleted upon successful deletion
- Operation is performed in a transaction for data integrity

---

## 5. Get All Doctors

Retrieve all doctors with advanced filtering, search, and pagination capabilities.

### Endpoint
```
GET /api/v1/get_doctor
```

### Headers
```
Content-Type: application/json
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search by doctor name, specialization, clinic name, or address |
| active | integer | No | Filter by active status (0/1) - also filters clinics and cities |
| department | integer | No | Filter by department ID |
| clinic_id | integer | No | Filter by clinic ID |
| city_id | integer | No | Filter by city ID |
| start | integer | No | Pagination start index (use with end) |
| end | integer | No | Pagination end index (use with start) |

### Request Example
```typescript
// Basic request
const response = await fetch('/api/v1/get_doctor', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

// With filters and pagination
const params = new URLSearchParams({
  search: 'cardiology',
  active: '1',
  department: '1',
  clinic_id: '3',
  city_id: '5',
  start: '0',
  end: '10'
});

const response = await fetch(`/api/v1/get_doctor?${params}`, {
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
  "total_record": 45,
  "data": [
    {
      "id": 1,
      "user_id": 456,
      "department": 1,
      "specialization": 5,
      "description": "Experienced cardiologist",
      "room": "201",
      "ex_year": 10,
      "active": 1,
      "clinic_id": 3,
      "license_number": "MED123456",
      "ptr_number": "PTR789012",
      "signature": "doctors/signatures/sig_123.jpg",
      "zoom_client_id": null,
      "zoom_secret_id": null,
      "insta_link": "https://instagram.com/drjohn",
      "fb_linik": "https://facebook.com/drjohn",
      "twitter_link": null,
      "you_tube_link": null,
      "video_appointment": 1,
      "clinic_appointment": 1,
      "emergency_appointment": 0,
      "opd_fee": "500.00",
      "video_fee": "400.00",
      "emg_fee": "800.00",
      "stop_booking": 0,
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00",
      "f_name": "John",
      "l_name": "Doe",
      "phone": "1234567890",
      "isd_code": "+1",
      "gender": "male",
      "dob": "1985-05-15",
      "email": "john.doe@example.com",
      "image": "users/doctor_123.jpg",
      "department_name": "Cardiology",
      "clinic_title": "City Medical Center",
      "city_title": "New York",
      "state_title": "New York",
      "clinics_address": "123 Medical Plaza, Downtown",
      "total_review_points": 450,
      "number_of_reviews": 98,
      "average_rating": "4.59",
      "total_appointment_done": 234
    }
  ]
}
```

### TypeScript Interface
```typescript
interface DoctorListItem {
  // Doctor Table Fields
  id: number;
  user_id: number;
  department: number;
  specialization: number;
  description: string | null;
  room: string | null;
  ex_year: number;
  active: 0 | 1;
  clinic_id: number;
  license_number: string | null;
  ptr_number: string | null;
  signature: string | null;
  zoom_client_id: string | null;
  zoom_secret_id: string | null;
  insta_link: string | null;
  fb_linik: string | null;
  twitter_link: string | null;
  you_tube_link: string | null;
  video_appointment: 0 | 1;
  clinic_appointment: 0 | 1;
  emergency_appointment: 0 | 1;
  opd_fee: string | null;
  video_fee: string | null;
  emg_fee: string | null;
  stop_booking: 0 | 1;
  created_at: string;
  updated_at: string;
  
  // User Table Fields
  f_name: string;
  l_name: string;
  phone: string;
  isd_code: string;
  gender: string;
  dob: string;
  email: string;
  image: string | null;
  
  // Related Data
  department_name: string;
  clinic_title: string;
  city_title: string;
  state_title: string;
  clinics_address: string;
  
  // Calculated Fields
  total_review_points: number;
  number_of_reviews: number;
  average_rating: string;
  total_appointment_done: number;
}

interface GetDoctorsResponse {
  response: number;
  total_record: number;
  data: DoctorListItem[];
}
```

### Notes
- Results are ordered by creation date (newest first)
- Search matches: doctor name, specialization, clinic name, clinic address
- Pagination: Use `start` and `end` together (e.g., 0-10, 10-20)
- `total_record` shows total matches before pagination
- Average rating calculated from all reviews
- Active filter applies to doctors, clinics, and cities simultaneously

---

## 6. Get Doctor by ID

Retrieve detailed information about a specific doctor including clinic images and statistics.

### Endpoint
```
GET /api/v1/get_doctor/{id}
```

### Headers
```
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Doctor's user ID |

### Request Example
```typescript
const doctorId = 456;
const response = await fetch(`/api/v1/get_doctor/${doctorId}`, {
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
    "user_id": 456,
    "department": 1,
    "specialization": 5,
    "description": "Experienced cardiologist with 10 years of practice",
    "room": "201",
    "ex_year": 10,
    "active": 1,
    "clinic_id": 3,
    "license_number": "MED123456",
    "ptr_number": "PTR789012",
    "signature": "doctors/signatures/sig_123.jpg",
    "zoom_client_id": "zoom_client_xyz",
    "zoom_secret_id": "zoom_secret_abc",
    "insta_link": "https://instagram.com/drjohn",
    "fb_linik": "https://facebook.com/drjohn",
    "twitter_link": "https://twitter.com/drjohn",
    "you_tube_link": "https://youtube.com/drjohn",
    "video_appointment": 1,
    "clinic_appointment": 1,
    "emergency_appointment": 0,
    "opd_fee": "500.00",
    "video_fee": "400.00",
    "emg_fee": "800.00",
    "stop_booking": 0,
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-15 10:30:00",
    "f_name": "John",
    "l_name": "Doe",
    "phone": "1234567890",
    "isd_code": "+1",
    "gender": "male",
    "dob": "1985-05-15",
    "email": "john.doe@example.com",
    "image": "users/doctor_123.jpg",
    "address": "456 Oak Street, Apt 5B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "isd_code_sec": "+1",
    "phone_sec": "9876543210",
    "department_name": "Cardiology",
    "clinic_title": "City Medical Center",
    "clinics_address": "123 Medical Plaza, Downtown",
    "clinic_thumb_image": "clinics/clinic_thumb_3.jpg",
    "clinic_phone": "5551234567",
    "clinic_phone_second": "5559876543",
    "clinic_email": "info@citymedical.com",
    "clinic_stop_booking": 0,
    "clinic_coupon_enable": 1,
    "clinic_latitude": "40.7128",
    "clinic_longitude": "-74.0060",
    "clinic_tax": "8.50",
    "city_title": "New York",
    "state_title": "New York",
    "total_review_points": 450,
    "number_of_reviews": 98,
    "average_rating": "4.59",
    "total_appointment_done": 234,
    "clinic_images": [
      {
        "id": 1,
        "clinic_id": 3,
        "image": "clinics/images/img_1.jpg",
        "created_at": "2024-01-10 09:00:00",
        "updated_at": "2024-01-10 09:00:00"
      },
      {
        "id": 2,
        "clinic_id": 3,
        "image": "clinics/images/img_2.jpg",
        "created_at": "2024-01-10 09:05:00",
        "updated_at": "2024-01-10 09:05:00"
      }
    ]
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
interface ClinicImage {
  id: number;
  clinic_id: number;
  image: string;
  created_at: string;
  updated_at: string;
}

interface DoctorDetail {
  // Doctor Table Fields
  id: number;
  user_id: number;
  department: number;
  specialization: number;
  description: string | null;
  room: string | null;
  ex_year: number;
  active: 0 | 1;
  clinic_id: number;
  license_number: string | null;
  ptr_number: string | null;
  signature: string | null;
  zoom_client_id: string | null;
  zoom_secret_id: string | null;
  insta_link: string | null;
  fb_linik: string | null;
  twitter_link: string | null;
  you_tube_link: string | null;
  video_appointment: 0 | 1;
  clinic_appointment: 0 | 1;
  emergency_appointment: 0 | 1;
  opd_fee: string | null;
  video_fee: string | null;
  emg_fee: string | null;
  stop_booking: 0 | 1;
  created_at: string;
  updated_at: string;
  
  // User Personal Info
  f_name: string;
  l_name: string;
  phone: string;
  isd_code: string;
  phone_sec: string | null;
  isd_code_sec: string | null;
  gender: string;
  dob: string;
  email: string;
  image: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  
  // Related Data
  department_name: string;
  clinic_title: string;
  clinics_address: string;
  clinic_thumb_image: string | null;
  clinic_phone: string | null;
  clinic_phone_second: string | null;
  clinic_email: string | null;
  clinic_stop_booking: 0 | 1;
  clinic_coupon_enable: 0 | 1;
  clinic_latitude: string | null;
  clinic_longitude: string | null;
  clinic_tax: string | null;
  city_title: string;
  state_title: string;
  
  // Calculated Fields
  total_review_points: number;
  number_of_reviews: number;
  average_rating: string;
  total_appointment_done: number;
  
  // Clinic Images
  clinic_images: ClinicImage[];
}

interface GetDoctorByIdResponse {
  response: number;
  data: DoctorDetail | null;
}
```

### Notes
- Returns comprehensive doctor and clinic information
- Includes all clinic images ordered by creation date (newest first)
- Statistics include total reviews, average rating, and completed appointments
- Returns null if doctor not found
- Includes clinic location coordinates for map integration
- Contains all social media links and Zoom credentials

---

## Common Data Types

### Doctor Complete Object
```typescript
interface Doctor {
  // Core Doctor Info
  id: number;
  user_id: number;
  department: number;
  specialization: number;
  description: string | null;
  room: string | null;
  ex_year: number;
  active: 0 | 1;
  clinic_id: number;
  
  // Credentials
  license_number: string | null;
  ptr_number: string | null;
  signature: string | null;
  
  // Video Conference
  zoom_client_id: string | null;
  zoom_secret_id: string | null;
  
  // Social Media
  insta_link: string | null;
  fb_linik: string | null;
  twitter_link: string | null;
  you_tube_link: string | null;
  
  // Appointment Settings
  video_appointment: 0 | 1;
  clinic_appointment: 0 | 1;
  emergency_appointment: 0 | 1;
  stop_booking: 0 | 1;
  
  // Fees
  opd_fee: string | null;
  video_fee: string | null;
  emg_fee: string | null;
  
  // Timestamps
  created_at: string; // Format: "YYYY-MM-DD HH:mm:ss"
  updated_at: string; // Format: "YYYY-MM-DD HH:mm:ss"
}

interface User {
  f_name: string;
  l_name: string;
  email: string;
  phone: string;
  isd_code: string;
  phone_sec: string | null;
  isd_code_sec: string | null;
  gender: string;
  dob: string; // Format: "YYYY-MM-DD"
  image: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
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
| `phone number already exists` | Phone number is already registered |
| `email id already exists` | Email address is already registered |
| `Please enter valid phone number` | Phone number contains non-numeric characters |
| `error` | Generic server error occurred |
| `error $e` | Server error with exception details |
| `This record cannot be deleted...` | Doctor is linked to other records |

### HTTP Status Codes
- `200` - Success (even for logical errors, check response.response field)
- `400` - Validation error (missing required parameters)

---

## File Handling

### Image Upload
- Profile images stored in: `storage/app/public/users/`
- Signature images stored in: `storage/app/public/doctors/signatures/`
- Upload as multipart/form-data
- Old images automatically deleted when updating (except "def.png")

### Image URL
To display images in your React app:
```typescript
const profileImageUrl = `${baseStorageUrl}/${doctor.image}`;
const signatureUrl = `${baseStorageUrl}/${doctor.signature}`;
```

### Default Image
- Default image identifier: `"def.png"`
- Not deleted when removing/updating images

---

## React/TypeScript Usage Example

### Complete CRUD Service
```typescript
// types/doctor.ts
export interface Doctor {
  id: number;
  user_id: number;
  department: number;
  specialization: number;
  description: string | null;
  room: string | null;
  ex_year: number;
  active: 0 | 1;
  clinic_id: number;
  license_number: string | null;
  ptr_number: string | null;
  signature: string | null;
  zoom_client_id: string | null;
  zoom_secret_id: string | null;
  insta_link: string | null;
  fb_linik: string | null;
  twitter_link: string | null;
  you_tube_link: string | null;
  video_appointment: 0 | 1;
  clinic_appointment: 0 | 1;
  emergency_appointment: 0 | 1;
  opd_fee: string | null;
  video_fee: string | null;
  emg_fee: string | null;
  stop_booking: 0 | 1;
  created_at: string;
  updated_at: string;
  f_name: string;
  l_name: string;
  phone: string;
  isd_code: string;
  gender: string;
  dob: string;
  email: string;
  image: string | null;
  department_name: string;
  clinic_title: string;
  city_title: string;
  state_title: string;
  clinics_address: string;
  total_review_points: number;
  number_of_reviews: number;
  average_rating: string;
  total_appointment_done: number;
}

export interface ApiResponse<T> {
  response: number;
  data?: T;
  message?: string;
  id?: number;
  total_record?: number;
}

// services/doctorService.ts
import axios from 'axios';
import { Doctor, ApiResponse } from '../types/doctor';

const API_BASE_URL = '/api/v1';

interface DoctorFilters {
  search?: string;
  active?: 0 | 1;
  department?: number;
  clinic_id?: number;
  city_id?: number;
  start?: number;
  end?: number;
}

interface CreateDoctorData {
  f_name: string;
  l_name: string;
  email: string;
  password: string;
  phone?: string;
  isd_code?: string;
  dob: string;
  gender: string;
  department: number;
  specialization: number;
  ex_year: number;
  clinic_id: number;
  active: 0 | 1;
  description?: string;
  room?: string;
  license_number?: string;
  ptr_number?: string;
  image?: File;
  signature?: File;
}

interface UpdateDoctorData {
  id: number;
  f_name?: string;
  l_name?: string;
  email?: string;
  password?: string;
  phone?: string;
  isd_code?: string;
  phone_sec?: string;
  isd_code_sec?: string;
  gender?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  department?: number;
  specialization?: number;
  ex_year?: number;
  description?: string;
  room?: string;
  active?: 0 | 1;
  license_number?: string;
  ptr_number?: string;
  zoom_client_id?: string;
  zoom_secret_id?: string;
  insta_link?: string;
  fb_linik?: string;
  twitter_link?: string;
  you_tube_link?: string;
  video_appointment?: 0 | 1;
  clinic_appointment?: 0 | 1;
  emergency_appointment?: 0 | 1;
  opd_fee?: number;
  video_fee?: number;
  emg_fee?: number;
  stop_booking?: 0 | 1;
  image?: File;
  signature?: File;
}

class DoctorService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async getAllDoctors(filters?: DoctorFilters): Promise<{ 
    doctors: Doctor[]; 
    totalRecords: number;
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/get_doctor${params.toString() ? `?${params}` : ''}`;
    const response = await axios.get<ApiResponse<Doctor[]>>(url);
    
    return {
      doctors: response.data.data || [],
      totalRecords: response.data.total_record || 0
    };
  }

  async getDoctorById(id: number): Promise<Doctor | null> {
    const response = await axios.get<ApiResponse<Doctor>>(
      `${API_BASE_URL}/get_doctor/${id}`
    );
    return response.data.data || null;
  }

  async createDoctor(data: CreateDoctorData): Promise<{ 
    success: boolean; 
    id?: number; 
    message?: string;
  }> {
    const formData = new FormData();
    
    // Required fields
    formData.append('f_name', data.f_name);
    formData.append('l_name', data.l_name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('dob', data.dob);
    formData.append('gender', data.gender);
    formData.append('department', data.department.toString());
    formData.append('specialization', data.specialization.toString());
    formData.append('ex_year', data.ex_year.toString());
    formData.append('clinic_id', data.clinic_id.toString());
    formData.append('active', data.active.toString());
    
    // Optional fields
    if (data.phone) formData.append('phone', data.phone);
    if (data.isd_code) formData.append('isd_code', data.isd_code);
    if (data.description) formData.append('description', data.description);
    if (data.room) formData.append('room', data.room);
    if (data.license_number) formData.append('license_number', data.license_number);
    if (data.ptr_number) formData.append('ptr_number', data.ptr_number);
    if (data.image) formData.append('image', data.image);
    if (data.signature) formData.append('signature', data.signature);

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/add_doctor`,
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

  async updateDoctor(data: UpdateDoctorData): Promise<{ 
    success: boolean; 
    message?: string;
  }> {
    const formData = new FormData();
    formData.append('id', data.id.toString());
    
    // Add all other fields if provided
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/update_doctor`,
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

  async removeDoctorImage(id: number): Promise<{ 
    success: boolean; 
    message?: string;
  }> {
    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/remove_doctor_image`,
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

  async deleteDoctor(id: number): Promise<{ 
    success: boolean; 
    message?: string;
  }> {
    const response = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/delete_doctor`,
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

export const doctorService = new DoctorService();
```

### React Component Example
```typescript
// components/DoctorList.tsx
import React, { useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';
import { Doctor } from '../types/doctor';

const DoctorList: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadDoctors();
  }, [searchTerm, currentPage]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const { doctors: data, totalRecords: total } = await doctorService.getAllDoctors({
        search: searchTerm || undefined,
        active: 1,
        start: currentPage * pageSize,
        end: (currentPage + 1) * pageSize
      });
      setDoctors(data);
      setTotalRecords(total);
      setError(null);
    } catch (err) {
      setError('Failed to load doctors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) {
      return;
    }

    try {
      const result = await doctorService.deleteDoctor(id);
      if (result.success) {
        alert('Doctor deleted successfully');
        loadDoctors();
      } else {
        alert(result.message || 'Failed to delete doctor');
      }
    } catch (err) {
      alert('An error occurred while deleting the doctor');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="doctor-list">
      <h2>Doctors</h2>
      
      <input
        type="text"
        placeholder="Search doctors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      <div className="doctors-grid">
        {doctors.map((doctor) => (
          <div key={doctor.user_id} className="doctor-card">
            {doctor.image && (
              <img
                src={`${process.env.REACT_APP_STORAGE_URL}/${doctor.image}`}
                alt={`${doctor.f_name} ${doctor.l_name}`}
              />
            )}
            <h3>Dr. {doctor.f_name} {doctor.l_name}</h3>
            <p>{doctor.department_name}</p>
            <p>{doctor.clinic_title}</p>
            <p>Experience: {doctor.ex_year} years</p>
            <p>Rating: {doctor.average_rating} ({doctor.number_of_reviews} reviews)</p>
            <p>Appointments: {doctor.total_appointment_done}</p>
            <div className="fees">
              <span>OPD: ${doctor.opd_fee}</span>
              <span>Video: ${doctor.video_fee}</span>
            </div>
            <button onClick={() => handleDelete(doctor.user_id)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button 
          disabled={currentPage === 0}
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          Previous
        </button>
        <span>
          Page {currentPage + 1} of {Math.ceil(totalRecords / pageSize)}
        </span>
        <button 
          disabled={(currentPage + 1) * pageSize >= totalRecords}
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DoctorList;
```

### Create Doctor Form Example
```typescript
// components/CreateDoctorForm.tsx
import React, { useState } from 'react';
import { doctorService } from '../services/doctorService';

const CreateDoctorForm: React.FC = () => {
  const [formData, setFormData] = useState({
    f_name: '',
    l_name: '',
    email: '',
    password: '',
    phone: '',
    isd_code: '+1',
    dob: '',
    gender: 'male' as 'male' | 'female' | 'other',
    department: 0,
    specialization: 0,
    ex_year: 0,
    clinic_id: 0,
    active: 1 as 0 | 1,
    description: '',
    room: '',
    license_number: '',
    ptr_number: '',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await doctorService.createDoctor({
        ...formData,
        image: profileImage || undefined,
        signature: signature || undefined,
      });

      if (result.success) {
        alert(`Doctor created successfully! ID: ${result.id}`);
        // Reset form or redirect
      } else {
        alert(result.message || 'Failed to create doctor');
      }
    } catch (err) {
      alert('An error occurred while creating the doctor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="create-doctor-form">
      <h2>Create New Doctor</h2>
      
      <div className="form-group">
        <label>First Name *</label>
        <input
          type="text"
          name="f_name"
          value={formData.f_name}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Last Name *</label>
        <input
          type="text"
          name="l_name"
          value={formData.l_name}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Password *</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-group">
        <label>Date of Birth *</label>
        <input
          type="date"
          name="dob"
          value={formData.dob}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Gender *</label>
        <select name="gender" value={formData.gender} onChange={handleInputChange} required>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Years of Experience *</label>
        <input
          type="number"
          name="ex_year"
          value={formData.ex_year}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Profile Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
        />
      </div>

      <div className="form-group">
        <label>Signature</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSignature(e.target.files?.[0] || null)}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Doctor'}
      </button>
    </form>
  );
};

export default CreateDoctorForm;
```

---

## Notes and Best Practices

1. **Authentication**: POST endpoints requiring authentication use Laravel Sanctum tokens. Include the Bearer token in the Authorization header.

2. **File Uploads**: When uploading files (images/signatures), use `FormData` and set `Content-Type: multipart/form-data`.

3. **Response Codes**: The API returns HTTP 200 for most responses. Check the `response` field in the JSON body:
   - `200` = Success
   - `400` = Error/Failure

4. **Pagination**: Use `start` and `end` parameters together. Example: start=0, end=10 for first page.

5. **Search Functionality**: Searches across doctor name, specialization, clinic name, and clinic address.

6. **Calculated Fields**: 
   - `average_rating`: Calculated from all doctor reviews
   - `total_appointment_done`: Count of all appointments
   - `number_of_reviews`: Total review count

7. **Soft Delete Alternative**: Since doctors linked to appointments cannot be deleted, use `active: 0` to deactivate instead.

8. **Unique Constraints**: Email and phone must be unique across the system.

9. **Role Assignment**: Doctors are automatically assigned role ID 18.

10. **Transaction Safety**: Create, update, and delete operations use database transactions for data integrity.

11. **Image Storage**:
    - Profile images: `storage/app/public/users/`
    - Signatures: `storage/app/public/doctors/signatures/`
    - Configure storage symlink: `php artisan storage:link`

12. **Date Formats**:
    - `dob`: YYYY-MM-DD
    - `created_at/updated_at`: YYYY-MM-DD HH:mm:ss

13. **Appointment Types**: Doctors can enable three types:
    - `clinic_appointment`: In-person clinic visits
    - `video_appointment`: Online video consultations
    - `emergency_appointment`: Emergency appointments

14. **Fees**: Store fees as decimal strings (e.g., "500.00")

15. **Social Media**: Store full URLs for social media links

16. **Zoom Integration**: Store Zoom credentials for video appointments

---

## Changelog

- **2024-01-15**: Initial API documentation created
- Covers all Doctor CRUD operations
- Includes TypeScript interfaces and React examples
- Complete service layer implementation
