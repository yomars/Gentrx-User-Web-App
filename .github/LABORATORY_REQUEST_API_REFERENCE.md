# Laboratory Request API Reference

## Overview
The Laboratory Request API provides functionality to create, manage, and generate laboratory test request forms. It works similarly to the prescription system but is specifically designed for requesting laboratory tests (CBC, Lipid Profile, etc.).

## Database Schema

### Table: `laboratory_request`
Stores the main laboratory request information.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Primary key |
| appointment_id | bigint (FK) | References appointments table |
| patient_id | bigint (FK) | References patients table |
| clinic_id | bigint (FK) | References clinics table |
| clinical_indication | text (nullable) | Reason for the laboratory tests |
| notes | text (nullable) | Additional notes or instructions |
| date | date | Date of the laboratory request |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

### Table: `laboratory_request_item`
Stores individual laboratory tests within a request.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Primary key |
| laboratory_request_id | bigint (FK) | References laboratory_request table |
| test_name | string | Name of the laboratory test (e.g., "CBC", "Lipid Profile") |
| test_category | string (nullable) | Category of test (e.g., "Hematology", "Clinical Chemistry") |
| special_instructions | text (nullable) | Special handling instructions |
| is_urgent | boolean | Whether the test is urgent (default: false) |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

---

## API Endpoints

### 1. Add Laboratory Request
Create a new laboratory request with multiple test items.

**Endpoint:** `POST /api/v1/add_laboratory_request`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "appointment_id": 123,
  "patient_id": 45,
  "clinical_indication": "Routine checkup and diabetes monitoring",
  "notes": "Patient fasting required for 8-12 hours before blood collection",
  "tests": [
    {
      "test_name": "Complete Blood Count (CBC)",
      "test_category": "Hematology",
      "special_instructions": "Collect in EDTA tube",
      "is_urgent": false
    },
    {
      "test_name": "Fasting Blood Sugar (FBS)",
      "test_category": "Clinical Chemistry",
      "special_instructions": "Patient must fast for 8 hours",
      "is_urgent": true
    },
    {
      "test_name": "Lipid Profile",
      "test_category": "Clinical Chemistry",
      "special_instructions": "Fasting required",
      "is_urgent": false
    }
  ]
}
```

**Validation Rules:**
- `appointment_id`: Required
- `patient_id`: Required
- `tests`: Required, must be an array
- `tests.*.test_name`: Required, must be a string
- `clinical_indication`: Optional
- `notes`: Optional
- `test_category`: Optional
- `special_instructions`: Optional
- `is_urgent`: Optional, boolean (default: false)

**Success Response:**
```json
{
  "response": 200,
  "message": "successfully",
  "id": 1
}
```

**Error Response:**
```json
{
  "response": 400
}
```

---

### 2. Get All Laboratory Requests
Retrieve laboratory requests with optional filters.

**Endpoint:** `GET /api/v1/get_laboratory_requests`

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)
- `patient_id` (optional): Filter by patient ID
- `clinic_id` (optional): Filter by clinic ID
- `doctor_id` (optional): Filter by doctor ID
- `search` (optional): Search by patient name or doctor name
- `start` (optional): Pagination start index
- `end` (optional): Pagination end index

**Example Request:**
```
GET /api/v1/get_laboratory_requests?clinic_id=1&start_date=2025-01-01&end_date=2025-12-31&start=0&end=10
```

**Success Response:**
```json
{
  "response": 200,
  "total_record": 25,
  "data": [
    {
      "id": 1,
      "appointment_id": 123,
      "patient_id": 45,
      "clinic_id": 1,
      "clinical_indication": "Routine checkup and diabetes monitoring",
      "notes": "Patient fasting required for 8-12 hours",
      "date": "2025-11-18",
      "patient_f_name": "John",
      "patient_l_name": "Doe",
      "doctor_f_name": "Jane",
      "doctor_l_name": "Smith",
      "created_at": "2025-11-18 10:30:00",
      "updated_at": "2025-11-18 10:30:00",
      "items": [
        {
          "id": 1,
          "laboratory_request_id": 1,
          "test_name": "Complete Blood Count (CBC)",
          "test_category": "Hematology",
          "special_instructions": "Collect in EDTA tube",
          "is_urgent": 0,
          "created_at": "2025-11-18 10:30:00",
          "updated_at": "2025-11-18 10:30:00"
        },
        {
          "id": 2,
          "laboratory_request_id": 1,
          "test_name": "Fasting Blood Sugar (FBS)",
          "test_category": "Clinical Chemistry",
          "special_instructions": "Patient must fast for 8 hours",
          "is_urgent": 1,
          "created_at": "2025-11-18 10:30:00",
          "updated_at": "2025-11-18 10:30:00"
        }
      ]
    }
  ]
}
```

---

### 3. Get Laboratory Request by ID
Retrieve a specific laboratory request with all its test items.

**Endpoint:** `GET /api/v1/get_laboratory_request/{id}`

**Authentication:** Required (Bearer Token)

**Example Request:**
```
GET /api/v1/get_laboratory_request/1
```

**Success Response:**
```json
{
  "response": 200,
  "data": {
    "id": 1,
    "appointment_id": 123,
    "patient_id": 45,
    "clinic_id": 1,
    "clinical_indication": "Routine checkup and diabetes monitoring",
    "notes": "Patient fasting required for 8-12 hours",
    "date": "2025-11-18",
    "created_at": "2025-11-18 10:30:00",
    "updated_at": "2025-11-18 10:30:00",
    "items": [
      {
        "id": 1,
        "laboratory_request_id": 1,
        "test_name": "Complete Blood Count (CBC)",
        "test_category": "Hematology",
        "special_instructions": "Collect in EDTA tube",
        "is_urgent": 0,
        "created_at": "2025-11-18 10:30:00",
        "updated_at": "2025-11-18 10:30:00"
      }
    ]
  }
}
```

---

### 4. Get Laboratory Requests by Appointment ID
Retrieve all laboratory requests for a specific appointment.

**Endpoint:** `GET /api/v1/get_laboratory_requests_by_appointment/{appointment_id}`

**Authentication:** Required (Bearer Token)

**Example Request:**
```
GET /api/v1/get_laboratory_requests_by_appointment/123
```

**Success Response:**
```json
{
  "response": 200,
  "data": [
    {
      "id": 1,
      "appointment_id": 123,
      "patient_id": 45,
      "clinic_id": 1,
      "clinical_indication": "Routine checkup",
      "notes": "Patient fasting required",
      "date": "2025-11-18",
      "patient_f_name": "John",
      "patient_l_name": "Doe",
      "created_at": "2025-11-18 10:30:00",
      "updated_at": "2025-11-18 10:30:00",
      "items": [
        {
          "id": 1,
          "laboratory_request_id": 1,
          "test_name": "Complete Blood Count (CBC)",
          "test_category": "Hematology",
          "special_instructions": "Collect in EDTA tube",
          "is_urgent": 0,
          "created_at": "2025-11-18 10:30:00",
          "updated_at": "2025-11-18 10:30:00"
        }
      ]
    }
  ]
}
```

---

### 5. Update Laboratory Request
Update an existing laboratory request and its test items.

**Endpoint:** `POST /api/v1/update_laboratory_request`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "id": 1,
  "clinical_indication": "Updated clinical indication",
  "notes": "Updated notes",
  "tests": [
    {
      "test_name": "Complete Blood Count (CBC)",
      "test_category": "Hematology",
      "special_instructions": "Updated instructions",
      "is_urgent": true
    },
    {
      "test_name": "HbA1c",
      "test_category": "Clinical Chemistry",
      "special_instructions": "New test added",
      "is_urgent": false
    }
  ]
}
```

**Validation Rules:**
- `id`: Required
- `clinical_indication`: Optional
- `notes`: Optional
- `tests`: Optional (if provided, will replace all existing test items)

**Success Response:**
```json
{
  "response": 200,
  "message": "successfully"
}
```

**Error Response:**
```json
{
  "response": 400
}
```

**Note:** When updating tests, all existing test items will be deleted and replaced with the new ones provided.

---

### 6. Delete Laboratory Request
Delete a laboratory request and all its associated test items.

**Endpoint:** `POST /api/v1/delete_laboratory_request`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "id": 1
}
```

**Validation Rules:**
- `id`: Required

**Success Response:**
```json
{
  "response": 200,
  "message": "successfully"
}
```

**Error Response:**
```json
{
  "response": 400
}
```

---

### 7. Generate Laboratory Request PDF
Generate and download a PDF of the laboratory request form.

**Endpoint:** `GET /laboratory_request/pdf/{id}`

**Authentication:** Not required (public route)

**Example Request:**
```
GET /laboratory_request/pdf/1
```

**Response:** PDF file stream

**PDF Contents:**
- Hospital/Clinic logo and information
- Patient details (ID, name, age, gender)
- Request date and appointment date
- Requesting doctor information
- Department
- Clinical indication
- List of requested tests with categories, instructions, and urgency status
- Additional notes
- Signature sections for patient/guardian and doctor

---

## React Implementation Guide

### State Management Example

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

const LaboratoryRequestPage = () => {
  const [labRequests, setLabRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    clinic_id: null,
    start_date: null,
    end_date: null,
    patient_id: null,
    doctor_id: null,
    search: ''
  });

  // Fetch laboratory requests
  const fetchLabRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await axios.get(
        `/api/v1/get_laboratory_requests?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setLabRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching lab requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabRequests();
  }, [filters]);

  return (
    <div>
      {/* Your component UI */}
    </div>
  );
};
```

### Add Laboratory Request Form Example

```jsx
import { useState } from 'react';
import axios from 'axios';

const AddLaboratoryRequestForm = ({ appointmentId, patientId, onSuccess }) => {
  const [formData, setFormData] = useState({
    appointment_id: appointmentId,
    patient_id: patientId,
    clinical_indication: '',
    notes: '',
    tests: []
  });

  const [newTest, setNewTest] = useState({
    test_name: '',
    test_category: '',
    special_instructions: '',
    is_urgent: false
  });

  const addTest = () => {
    if (newTest.test_name) {
      setFormData({
        ...formData,
        tests: [...formData.tests, { ...newTest }]
      });
      setNewTest({
        test_name: '',
        test_category: '',
        special_instructions: '',
        is_urgent: false
      });
    }
  };

  const removeTest = (index) => {
    const updatedTests = formData.tests.filter((_, i) => i !== index);
    setFormData({ ...formData, tests: updatedTests });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        '/api/v1/add_laboratory_request',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.response === 200) {
        alert('Laboratory request created successfully!');
        onSuccess && onSuccess(response.data.id);
      }
    } catch (error) {
      console.error('Error creating lab request:', error);
      alert('Failed to create laboratory request');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Clinical Indication:</label>
        <textarea
          value={formData.clinical_indication}
          onChange={(e) => setFormData({ ...formData, clinical_indication: e.target.value })}
          placeholder="Reason for laboratory tests"
        />
      </div>

      <div>
        <label>Additional Notes:</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Special instructions or notes"
        />
      </div>

      <div>
        <h3>Laboratory Tests</h3>
        
        {/* Add Test Section */}
        <div>
          <input
            type="text"
            placeholder="Test Name (e.g., CBC)"
            value={newTest.test_name}
            onChange={(e) => setNewTest({ ...newTest, test_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category (e.g., Hematology)"
            value={newTest.test_category}
            onChange={(e) => setNewTest({ ...newTest, test_category: e.target.value })}
          />
          <input
            type="text"
            placeholder="Special Instructions"
            value={newTest.special_instructions}
            onChange={(e) => setNewTest({ ...newTest, special_instructions: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={newTest.is_urgent}
              onChange={(e) => setNewTest({ ...newTest, is_urgent: e.target.checked })}
            />
            Urgent
          </label>
          <button type="button" onClick={addTest}>Add Test</button>
        </div>

        {/* Tests List */}
        <ul>
          {formData.tests.map((test, index) => (
            <li key={index}>
              <strong>{test.test_name}</strong>
              {test.test_category && ` - ${test.test_category}`}
              {test.is_urgent && <span style={{ color: 'red' }}> (URGENT)</span>}
              <button type="button" onClick={() => removeTest(index)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>

      <button type="submit" disabled={formData.tests.length === 0}>
        Create Laboratory Request
      </button>
    </form>
  );
};
```

### Display Laboratory Request Details

```jsx
const LaboratoryRequestDetails = ({ requestId }) => {
  const [labRequest, setLabRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabRequest = async () => {
      try {
        const response = await axios.get(
          `/api/v1/get_laboratory_request/${requestId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setLabRequest(response.data.data);
      } catch (error) {
        console.error('Error fetching lab request:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLabRequest();
  }, [requestId]);

  const downloadPDF = () => {
    window.open(`/laboratory_request/pdf/${requestId}`, '_blank');
  };

  if (loading) return <div>Loading...</div>;
  if (!labRequest) return <div>Laboratory request not found</div>;

  return (
    <div>
      <h2>Laboratory Request Details</h2>
      
      <div>
        <p><strong>Date:</strong> {labRequest.date}</p>
        <p><strong>Clinical Indication:</strong> {labRequest.clinical_indication || 'N/A'}</p>
        <p><strong>Notes:</strong> {labRequest.notes || 'N/A'}</p>
      </div>

      <h3>Requested Tests</h3>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Category</th>
            <th>Special Instructions</th>
            <th>Urgent</th>
          </tr>
        </thead>
        <tbody>
          {labRequest.items.map(item => (
            <tr key={item.id}>
              <td>{item.test_name}</td>
              <td>{item.test_category || '--'}</td>
              <td>{item.special_instructions || '--'}</td>
              <td>{item.is_urgent ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={downloadPDF}>Download PDF</button>
    </div>
  );
};
```

---

## Common Laboratory Tests Reference

### Hematology
- Complete Blood Count (CBC)
- Hemoglobin (Hgb)
- Hematocrit (Hct)
- Platelet Count
- White Blood Cell Count (WBC)
- Erythrocyte Sedimentation Rate (ESR)
- Prothrombin Time (PT)
- Partial Thromboplastin Time (PTT)

### Clinical Chemistry
- Fasting Blood Sugar (FBS)
- Random Blood Sugar (RBS)
- HbA1c (Glycated Hemoglobin)
- Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)
- Liver Function Test (SGPT, SGOT, Alkaline Phosphatase)
- Kidney Function Test (Creatinine, BUN, Uric Acid)
- Electrolytes (Sodium, Potassium, Chloride)
- Thyroid Function Test (T3, T4, TSH)

### Microbiology
- Urinalysis
- Stool Examination
- Blood Culture
- Urine Culture
- Sputum Culture
- Gram Stain

### Serology/Immunology
- Hepatitis B Surface Antigen (HBsAg)
- Anti-HCV (Hepatitis C)
- HIV Screening
- Dengue NS1 Antigen / IgG / IgM
- Typhoid Test (Widal Test)

### Others
- Pregnancy Test (hCG)
- Drug Test
- COVID-19 RT-PCR / Antigen Test
- Chest X-Ray
- ECG (Electrocardiogram)

---

## Notifications

The system automatically sends notifications when:

### Add Laboratory Request
- **To Patient:** "New Laboratory Request Added! A new laboratory request has been added by Dr. [Doctor Name] for your recent visit on [Date]."
- **To Doctor:** "Laboratory Request Issued. You have successfully issued a laboratory request for [Patient Name]."

### Update Laboratory Request
- **To Patient:** "Laboratory Request Updated. Your laboratory request from Dr. [Doctor Name] has been updated. Please review the new details in the app."
- **To Doctor:** "Laboratory Request Updated. You have updated the laboratory request for [Patient Name] on [Date]."

### Delete Laboratory Request
- **To Patient:** "Laboratory Request Deleted. Your laboratory request from Dr. [Doctor Name] has been deleted."
- **To Doctor:** "Laboratory Request Deleted. You have deleted the laboratory request for [Patient Name] on [Date]."

---

## Error Handling

### Common Errors

1. **400 Bad Request**: Validation failed
   - Missing required fields
   - Invalid data format

2. **404 Not Found**: Laboratory request not found
   - Invalid laboratory request ID

3. **500 Internal Server Error**: Database or server error
   - Check server logs for details

### React Error Handling Example

```jsx
const handleApiError = (error) => {
  if (error.response) {
    switch (error.response.status) {
      case 400:
        alert('Invalid data. Please check your input.');
        break;
      case 404:
        alert('Laboratory request not found.');
        break;
      case 500:
        alert('Server error. Please try again later.');
        break;
      default:
        alert('An error occurred. Please try again.');
    }
  } else if (error.request) {
    alert('No response from server. Check your connection.');
  } else {
    alert('Error: ' + error.message);
  }
};
```

---

## Best Practices

1. **Always validate input** before submitting forms
2. **Use pagination** for large datasets (start/end parameters)
3. **Implement loading states** for better UX
4. **Cache laboratory request data** when appropriate
5. **Handle errors gracefully** with user-friendly messages
6. **Confirm deletions** before executing
7. **Use debouncing** for search functionality
8. **Store authentication tokens securely**
9. **Implement proper authorization** checks on the frontend
10. **Test PDF generation** across different browsers

---

## Security Considerations

1. All endpoints (except PDF generation) require authentication
2. Use HTTPS in production
3. Validate user permissions before allowing create/update/delete operations
4. Sanitize all input data
5. Implement rate limiting to prevent abuse
6. Store sensitive data securely
7. Use proper CORS configuration

---

## Additional Notes

- Laboratory requests are tied to appointments
- All test items are deleted when updating tests (not partial updates)
- PDF generation is available without authentication for easy sharing
- Notifications are sent automatically to both patient and doctor
- The system supports urgent test marking
- Clinical indication and notes are optional but recommended
- Test categories help organize different types of laboratory tests

---

**Created:** November 18, 2025  
**Version:** 1.0  
**Last Updated:** November 18, 2025
