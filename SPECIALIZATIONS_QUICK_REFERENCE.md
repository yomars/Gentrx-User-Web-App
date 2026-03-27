# Specializations Page - Quick Reference

## What Was Created

### New Page
- **Route**: `/specializations`
- **File**: `src/Pages/Specializations.jsx`
- Full-page view of all medical specializations with title and description

### Reusable Component  
- **File**: `src/Components/Specializations.jsx`
- Can be embedded in other pages (like HomePage, etc.)

### Service Layer
- **File**: `src/services/specializationService.js`
- Contains all API functions for CRUD operations on specializations

### Custom Hook
- **File**: `src/Hooks/useSpecializations.js`
- React Query hook for easy data fetching

## Key Features

✅ Responsive grid layout (2/3/5 columns based on screen size)  
✅ Loading skeletons during data fetch  
✅ Error handling with error page  
✅ Hover effects (scale + color change)  
✅ Images from API with fallback placeholders  
✅ Click navigation to specialization details  
✅ Follows existing code patterns  
✅ Uses Chakra UI for styling  
✅ Lazy loaded for performance  

## Quick Start

### View the Page
Navigate to: `http://localhost:5173/specializations` (or your dev server URL)

### Add to Homepage
```jsx
import Specializations from "../Components/Specializations";

// In your HomePage component:
<Specializations />
```

### Use in Custom Component
```jsx
import useSpecializations from "../Hooks/useSpecializations";

function MyComponent() {
  const { specializations, isLoading, error } = useSpecializations();
  // Use the data...
}
```

## Styling

- **Card Background**: Light green `rgba(100, 185, 129, 0.08)`
- **Hover**: Primary green with white text
- **Border Radius**: 15px
- **Card Height**: 132px
- **Icon Size**: 60-80px

## API Integration

Uses the following endpoint:
- `GET /api/v1/get_specialization` - Fetches all specializations

Data structure:
```json
{
  "response": 200,
  "data": [
    {
      "id": 1,
      "title": "Cardiology",
      "image": "specialization/cardiology_icon.png",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    }
  ]
}
```

## Files Modified

1. `src/Global/Main.jsx` - Added route for `/specializations`

## Next Steps (Optional)

- Create detail page for each specialization
- Add filter/search functionality  
- Display doctor count per specialization
- Add to navigation menu
- Create admin panel for managing specializations

## Notes

- Follows the same pattern as the existing Departments feature
- Ready for production use
- No additional dependencies required
- Compatible with existing theming system
