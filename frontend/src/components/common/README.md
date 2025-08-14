# OrganizationCard Component

A comprehensive, reusable organization card component that displays rich organization information with multiple variants and customization options.

## Features

- **Multiple Variants**: Default, compact, and detailed layouts
- **Rich Information Display**: Shows comprehensive organization details
- **Responsive Design**: Adapts to different screen sizes
- **Interactive Elements**: Hover effects and click handlers
- **Status Indicators**: Verification status and member counts
- **Statistics Display**: Member counts, event statistics, and impact metrics
- **Customizable**: Configurable stats display and styling

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `organization` | Object | Required | Organization data object |
| `onClick` | Function | Required | Click handler function |
| `variant` | String | 'default' | Card variant: 'default', 'compact', 'detailed' |
| `showStats` | Boolean | true | Whether to show statistics section |
| `showActions` | Boolean | false | Whether to show action buttons (reserved for future use) |
| `className` | String | '' | Additional CSS classes |

## Organization Data Structure

The component expects an organization object with the following fields:

```javascript
{
  _id: String,
  name: String,
  description: String,
  logo: String, // file path
  logoUrl: String, // URL
  website: String,
  city: String,
  state: String,
  headOfficeLocation: String,
  yearOfEstablishment: Number,
  focusArea: String,
  focusAreaOther: String,
  verifiedStatus: String, // 'pending', 'blueApplicant', 'blueVerified', 'blueChampion'
  team: Array, // Array of team members
  events: Array, // Array of events
  memberCount: Number, // Optional: calculated from team if not provided
  totalEvents: Number, // Optional: calculated from events if not provided
  upcomingEvents: Number, // Optional: calculated from events if not provided
  pastEvents: Number, // Optional: calculated from events if not provided
  volunteerImpact: Object, // Impact metrics
  sponsorshipImpact: Object, // Sponsorship metrics
  createdAt: Date
}
```

## Variants

### Default Variant
- Standard card layout with full information
- Shows member and event statistics
- Includes location, focus area, and establishment year
- Best for main organization listings

### Compact Variant
- Minimal card design for space-constrained layouts
- Shows only essential information
- Ideal for sidebars, lists, and mobile views
- Displays member and event counts in compact format

### Detailed Variant
- Large card with extended information
- Includes impact metrics and detailed statistics
- Best for featured organizations or detailed views
- Shows comprehensive organization data

## Usage Examples

### Basic Usage
```jsx
import OrganizationCard from '../components/common/OrganizationCard';

<OrganizationCard
  organization={orgData}
  onClick={() => handleOrgClick(orgData)}
/>
```

### Compact Variant
```jsx
<OrganizationCard
  organization={orgData}
  onClick={() => handleOrgClick(orgData)}
  variant="compact"
  showStats={false}
/>
```

### Detailed Variant
```jsx
<OrganizationCard
  organization={orgData}
  onClick={() => handleOrgClick(orgData)}
  variant="detailed"
  showStats={true}
/>
```

### With Custom Styling
```jsx
<OrganizationCard
  organization={orgData}
  onClick={() => handleOrgClick(orgData)}
  className="border-2 border-blue-200"
/>
```

## Integration Points

The OrganizationCard component is currently used in:

1. **VolunteerOrganizationsTab** - Displaying all organizations for volunteers
2. **YourOrganizations** - Showing user's organization memberships
3. **JoinOrganizationPage** - Listing organizations available for joining
4. **Future implementations** - Can be used in dashboards, search results, etc.

## Styling

The component uses Tailwind CSS classes and follows the application's design system:
- Consistent with existing card designs
- Responsive grid layouts
- Hover effects and transitions
- Color-coded status indicators
- Gradient backgrounds and shadows

## Backend Requirements

To fully utilize the component's features, the backend should provide:

1. **Enhanced Organization Endpoints**: Updated to return comprehensive organization data
2. **Event Aggregation**: Calculate event statistics (upcoming, past, total)
3. **Member Counts**: Provide accurate team member statistics
4. **Impact Metrics**: Include volunteer and sponsorship impact data

## Future Enhancements

- Action buttons for different user roles
- Customizable stat displays
- Advanced filtering and sorting
- Integration with organization management features
- Enhanced accessibility features

## Demo

See `OrganizationCardDemo.jsx` for a comprehensive demonstration of all variants and features.
