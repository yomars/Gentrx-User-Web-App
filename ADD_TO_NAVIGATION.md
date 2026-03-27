# Adding Specializations to Navigation Menu

If you want to add a "Specializations" link to your navigation menu, follow these steps:

## Option 1: Add to Top Navigation (TopbarNew.jsx)

### 1. Update the LinksPublic array:

Find this line in `src/Global/TopbarNew.jsx`:
```jsx
const LinksPublic = ["Home", "Clinics", "Doctors"];
```

Change it to:
```jsx
const LinksPublic = ["Home", "Clinics", "Doctors", "Specializations"];
```

### 2. Update the SideBarLinks array (for mobile menu):

Find the SideBarLinks array and add:
```jsx
const SideBarLinks = [
  {
    name: "Home",
    icon: <AiFillHome />,
    auth: true,
  },
  {
    name: "Clinics",
    icon: <FaHospitalAlt />,
    auth: true,
  },
  {
    name: "Doctors",
    icon: <FaUserMd />,
    auth: true,
  },
  // ADD THIS:
  {
    name: "Specializations",
    icon: <MdHealthAndSafety />, // Or any icon you prefer
    auth: true,
  },
  // ... rest of the links
];
```

### 3. Import the icon (if needed):

Add at the top with other imports:
```jsx
import { MdHealthAndSafety } from "react-icons/md";
```

## Option 2: Quick Manual Link

You can also add a manual link anywhere in your navigation:

```jsx
import { Link } from "react-router-dom";

<Link to="/specializations">
  <Button>Specializations</Button>
</Link>
```

## Option 3: Add to Footer Links

In `src/Global/Footer.jsx`, you can add it to the useful links section:

```jsx
<Link to="/specializations">
  <Text>Specializations</Text>
</Link>
```

## Testing

After making changes:
1. Restart your development server
2. Check that the link appears in the navigation
3. Click the link to verify it navigates to `/specializations`
4. Test on mobile to ensure it appears in the mobile menu

## Example Icons You Can Use

- `MdHealthAndSafety` - Health/medical icon
- `FaStethoscope` - Stethoscope icon
- `FaHospitalAlt` - Hospital icon
- `MdLocalHospital` - Medical cross icon
- `FaUserMd` - Doctor icon

## Note

The navigation component automatically handles routing when you add the link name to the arrays. It converts "Specializations" to the route "/specializations" automatically.
