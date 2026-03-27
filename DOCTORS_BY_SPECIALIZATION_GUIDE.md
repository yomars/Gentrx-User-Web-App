# Doctors By Specialization Page - Implementation Guide

## Overview
A new page has been created to display a list of doctors filtered by specialization, following the Figma design specifications.

## Files Created/Modified

### 1. Created: `src/Pages/DoctorsBySpecialization.jsx`
**Purpose**: Main page component that displays doctors filtered by a specific specialization

**Key Features**:
- ✅ Fetches doctors by specialization ID from API
- ✅ Displays specialization name and result count
- ✅ Shows doctor cards with images, details, ratings, and clinic info
- ✅ Responsive design for mobile and desktop
- ✅ "View Profile" button linking to individual doctor pages
- ✅ Social media links for doctors
- ✅ Integrates with city filter context
- ✅ Loading and error states handled

**Design Specifications**:
- Background color: `rgba(100, 185, 129, 0.08)` (light green)
- Border radius: `10px`
- Button color: `#1243f0` (blue)
- Primary text color: `#0c8f3a` (green)
- Secondary text color: `#6a6a6a` (gray)

### 2. Modified: `src/Global/Main.jsx`
**Changes Made**:
- Added lazy import: `const DoctorsBySpecialization = lazy(() => import("../Pages/DoctorsBySpecialization"));`
- Added route: `<Route path="/specialization/:title/:id" element={<DoctorsBySpecialization />} />`

## Usage

### Navigating to the Page
The page accepts URL parameters:
```
/specialization/:title/:id
```

**Example URLs**:
```
/specialization/Cardiology/5
/specialization/Neurology/12
/specialization/Pediatrics/8
```

### URL Parameters
- `:title` - The name of the specialization (e.g., "Cardiology", "Neurology")
- `:id` - The specialization ID used to filter doctors

### Linking from Other Pages
Use React Router's Link component:

```jsx
import { Link } from "react-router-dom";

// Example link
<Link to={`/specialization/Cardiology/5`}>
  View Cardiology Specialists
</Link>

// Or programmatically
const navigate = useNavigate();
navigate(`/specialization/${specializationTitle}/${specializationId}`);
```

### Integration with Specializations Component
The existing Specializations component already links to this page:
```jsx
// In src/Components/Specializations.jsx
<Link to={`/specialization/${specialization.title}/${specialization.id}`}>
  {/* Specialization card */}
</Link>
```

## API Integration

### Endpoint Used
```
GET /api/v1/get_doctor?specialization={id}&active=1&city_id={cityId}
```

### Query Parameters
- `specialization`: The specialization ID to filter by
- `active`: Only show active doctors (1)
- `city_id`: Filter by selected city (from context)

### Data Structure
The API returns an array of doctor objects with the following key fields:
```typescript
{
  id: number;
  user_id: number;
  f_name: string;
  l_name: string;
  image: string | null;
  description: string | null;
  department_name: string;
  clinic_title: string;
  city_title: string;
  average_rating: string;
  number_of_reviews: number;
  insta_link: string | null;
  fb_linik: string | null;
  twitter_link: string | null;
  you_tube_link: string | null;
  // ... other fields
}
```

## Component Structure

### Layout Hierarchy
```
DoctorsBySpecialization
├── Hero Section (Blue background)
│   ├── Specialization Title
│   └── Subtitle
├── Header Section
│   ├── Specialization Name
│   └── Result Count
├── Doctors Grid
│   └── Doctor Cards (Loop)
│       ├── Doctor Image
│       ├── Doctor Details
│       │   ├── Name
│       │   ├── Department
│       │   ├── Description
│       │   ├── Clinic & Location
│       │   ├── Rating
│       │   └── Social Media Links
│       └── View Profile Button
```

### Responsive Breakpoints
- **Mobile** (`base`): Single column, stacked layout
- **Tablet** (`md`): Two-column layout for some elements
- **Desktop** (`lg`): Full horizontal layout

## Styling Details

### Color Palette
```css
Primary Green: #0c8f3a (text)
Primary Main: #64B981 (backgrounds)
Light Green BG: rgba(100, 185, 129, 0.08)
Secondary Blue: #1243f0 (buttons)
Text Gray: #6a6a6a
White: #fff
```

### Font Family
```css
font-family: 'Plus Jakarta Sans', sans-serif;
font-family: 'Quicksand', sans-serif; (for hero section)
```

### Card Styling
```jsx
backgroundColor: "rgba(100, 185, 129, 0.08)"
borderRadius: 10
padding: 5
transition: "all 0.3s ease"
_hover: {
  transform: "translateY(-2px)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
}
```

### Button Styling
```jsx
bg: "#1243f0"
color: "white"
borderRadius: "100px"
fontSize: { base: 16, md: 18 }
_hover: {
  bg: "#0032cc",
  transform: "scale(1.05)"
}
boxShadow: "0px 1px 2px 0px rgba(0,0,0,0.05)"
```

## Features

### 1. City Filtering
- Automatically filters doctors based on the selected city from context
- Updates when city selection changes
- Uses React Query for efficient data fetching

### 2. Doctor Information Display
Each doctor card shows:
- Profile image (with fallback to placeholder)
- Full name with "Dr." prefix
- Department/specialization name
- Description text (truncated on mobile)
- Clinic name with hospital icon
- City location with location icon
- Star rating with review count
- Social media links (desktop only)

### 3. Navigation
- "View Profile" button redirects to `/doctor/{userId}`
- Social media icons open links in new tabs
- Entire card is clickable (optional: can wrap in Link)

### 4. Empty State
- Shows `NotAvailable` component when no doctors found
- Provides user-friendly message

### 5. Loading State
- Uses `Loading` component during data fetch
- Prevents layout shift

### 6. Error Handling
- Shows `ErrorPage` component on API errors
- Graceful degradation

## Testing Checklist

- [x] Page loads without errors
- [x] Doctors filtered by specialization ID
- [x] City filter works correctly
- [x] Responsive layout on mobile/tablet/desktop
- [x] Images load with fallback
- [x] "View Profile" button navigates correctly
- [x] Social media links open in new tabs
- [x] Rating stars display correctly
- [x] Loading state shows properly
- [x] Error state handled gracefully
- [x] Empty state displays when no doctors found

## Future Enhancements

1. **Search Functionality**: Add search bar to filter doctors by name
2. **Sorting Options**: Sort by rating, experience, fees, etc.
3. **Filter Options**: Filter by clinic, appointment type, availability
4. **Pagination**: Add pagination for large result sets
5. **Doctor Comparison**: Allow users to compare multiple doctors
6. **Appointment Booking**: Direct booking from the list view
7. **Favorite Doctors**: Save doctors to favorites list

## Troubleshooting

### Issue: Page shows no doctors
**Solution**: 
- Check if specialization ID is valid
- Verify API endpoint is working
- Check if selected city has doctors in this specialization
- Review browser console for API errors

### Issue: Images not loading
**Solution**:
- Verify `imageBaseURL` is correctly configured
- Check image paths in API response
- Ensure fallback image `/imagePlaceholder.png` exists

### Issue: Routing not working
**Solution**:
- Verify route is added to `Main.jsx`
- Check lazy import syntax
- Ensure URL parameters are correct format

### Issue: City filter not working
**Solution**:
- Verify `useCity` context is properly set up
- Check if `selectedCity` has `id` property
- Review React Query cache invalidation

## Related Files

- `src/Pages/Doctors.jsx` - All doctors page
- `src/Pages/DoctorsDeptID.jsx` - Doctors by department page
- `src/Pages/Doctor.jsx` - Individual doctor detail page
- `src/Pages/Specializations.jsx` - All specializations page
- `src/Components/Specializations.jsx` - Specializations grid component
- `src/services/specializationService.js` - Specialization API service
- `src/Context/SelectedCity.jsx` - City selection context

## API Documentation Reference

See `DOCTOR_API_DOCUMENTATION.md` for complete API documentation.

Key endpoints:
- `GET /api/v1/get_doctor` - Get all doctors with filters
- `GET /api/v1/get_doctor/{id}` - Get single doctor details

## Notes

- This page follows the same design pattern as `DoctorsDeptID.jsx` but filters by specialization instead of department
- The design matches the Figma specifications provided (node-id: 199-45)
- Social media links are hidden on mobile for better UX
- The page is fully responsive and accessible
- All images are optimized for performance
