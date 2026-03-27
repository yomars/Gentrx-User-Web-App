# Specializations Feature Implementation

## Overview
This implementation adds a complete Specializations feature to the Medicare web application, following the existing codebase patterns and using the Specialization API endpoints.

## Files Created

### 1. Pages
- **`src/Pages/Specializations.jsx`** - Main page component for displaying all specializations with a full page layout

### 2. Components
- **`src/Components/Specializations.jsx`** - Reusable component for displaying specializations grid (can be used on homepage or other pages)

### 3. Services
- **`src/services/specializationService.js`** - Service layer for all Specialization API calls:
  - `getAllSpecializations()` - Get all specializations
  - `getSpecializationById(id)` - Get single specialization by ID
  - `createSpecialization(token, data)` - Create new specialization (admin)
  - `updateSpecialization(token, data)` - Update specialization (admin)
  - `deleteSpecialization(token, id)` - Delete specialization (admin)

### 4. Hooks
- **`src/Hooks/useSpecializations.js`** - Custom React hook for fetching specializations using React Query

### 5. Routing
- **Updated `src/Global/Main.jsx`** - Added route `/specializations` for the Specializations page

## Features

### User Features
- ✅ View all medical specializations in a responsive grid layout
- ✅ Click on any specialization to view related content (doctors, etc.)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Loading skeletons while data is being fetched
- ✅ Error handling with error page display
- ✅ Hover effects on specialization cards
- ✅ SEO-friendly page title and description

### Technical Features
- ✅ React Query integration for data fetching and caching
- ✅ Lazy loading for optimal performance
- ✅ Chakra UI components for consistent styling
- ✅ Follows existing project patterns and conventions
- ✅ TypeScript-ready service layer with JSDoc comments
- ✅ Reusable components and hooks

## Usage

### Accessing the Page
Navigate to `/specializations` in your browser to see all specializations.

### Using the Component
You can also use the Specializations component on other pages:

```jsx
import Specializations from "../Components/Specializations";

function SomePage() {
  return (
    <Box>
      <Specializations />
    </Box>
  );
}
```

### Using the Hook
If you need specializations data in a custom component:

```jsx
import useSpecializations from "../Hooks/useSpecializations";

function CustomComponent() {
  const { specializations, isLoading, error, refetch } = useSpecializations();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading specializations</div>;

  return (
    <div>
      {specializations?.map(spec => (
        <div key={spec.id}>{spec.title}</div>
      ))}
    </div>
  );
}
```

### Using the Service Layer
For advanced use cases (admin panels, forms, etc.):

```jsx
import {
  getAllSpecializations,
  getSpecializationById,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization
} from "../services/specializationService";

// Get all specializations
const specializations = await getAllSpecializations();

// Get single specialization
const specialization = await getSpecializationById(1);

// Create new (requires auth token)
const result = await createSpecialization(token, {
  title: "Cardiology",
  image: imageFile // File object
});

// Update (requires auth token)
await updateSpecialization(token, {
  id: 1,
  title: "Cardiovascular Medicine",
  image: newImageFile
});

// Delete (requires auth token)
await deleteSpecialization(token, 1);
```

## API Endpoints Used

- `GET /api/v1/get_specialization` - Get all specializations
- `GET /api/v1/get_specialization/{id}` - Get specialization by ID
- `POST /api/v1/add_specialization` - Create specialization (auth required)
- `POST /api/v1/update_specialization` - Update specialization (auth required)
- `POST /api/v1/delete_specialization` - Delete specialization (auth required)

## Design Implementation

The page design follows the Figma mockup:
- Clean, modern grid layout
- Soft green background on cards (`rgba(100, 185, 129, 0.08)`)
- Icon and text centered in each card
- Smooth hover transitions with scale and color change
- Responsive grid (2 columns on mobile, 3 on tablet, 5 on desktop)
- Consistent with existing Departments component styling

## Styling Details

- **Card Background**: `rgba(100, 185, 129, 0.08)` (light green)
- **Hover State**: Primary green background with white text
- **Border Radius**: 15px for cards
- **Card Height**: 132px (fixed)
- **Icon Size**: 60px x 60px
- **Font Sizes**: 
  - Title: 34px (desktop), 28px (mobile)
  - Description: 20px (desktop), 16px (mobile)
  - Card text: 18px (desktop), 16px (mobile)

## Testing Checklist

- [ ] Page loads at `/specializations` route
- [ ] Data fetches from API correctly
- [ ] Loading skeletons display while loading
- [ ] Specialization cards display with images
- [ ] Cards show placeholder image when no image available
- [ ] Hover effects work on cards
- [ ] Clicking card navigates to correct route
- [ ] Responsive layout works on mobile, tablet, desktop
- [ ] Error page displays on API failure
- [ ] Component can be reused on other pages

## Future Enhancements

- Add filtering by specialization category
- Add search functionality
- Create detail page for each specialization
- Add doctor count for each specialization
- Implement specialization-based doctor filtering
- Add admin panel for managing specializations

## Notes

- Images are served from `${apiAddress}/storage/${specialization.image}`
- The component uses React Query for automatic caching and refetching
- All components follow the existing Chakra UI theming system
- The service layer is ready for admin features when needed
- Navigation to specialization detail pages is set up but detail pages need to be created separately
