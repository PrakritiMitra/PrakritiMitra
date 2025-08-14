## OrganizationCard Component

A comprehensive, reusable component for displaying organization information across different contexts in the PrakritiMitra application.

### Features

- **Multiple Variants**: Different sizes and layouts for various use cases
- **Smart Logo Handling**: Automatic fallback to organization initials with emoji when no logo is available
- **Action Button Support**: Built-in support for action buttons (e.g., "Request to Join")
- **Auto-sizing**: Automatically adjusts card height based on content and action buttons
- **Responsive Design**: Adapts to different screen sizes and content lengths
- **Consistent Styling**: Maintains visual consistency across all variants

### Variants

| Variant | Height | Use Case | Description |
|---------|--------|----------|-------------|
| `default` | 360px | Cards with action buttons | Full height for cards that need action buttons |
| `compact` | 200px | Lists and tables | Minimal height for dense layouts |
| `detailed` | 500px | Detailed views | Extended height for comprehensive information |
| `dashboard` | 320px | Dashboard displays | Medium height for dashboard layouts |
| `browse` | 280px | Browsing without actions | Short height for browsing organizations |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `organization` | Object | Required | Organization data object |
| `onClick` | Function | - | Click handler for the card |
| `variant` | String | `'default'` | Card variant (see variants table above) |
| `showStats` | Boolean | `true` | Whether to show member and event statistics |
| `showActions` | Boolean | `false` | Whether to show action buttons (deprecated, use actionButtons) |
| `actionButtons` | ReactNode | `null` | Custom action buttons to display at the bottom |
| `autoSize` | Boolean | `false` | Automatically use 'browse' variant when no action buttons |
| `className` | String | `''` | Additional CSS classes |

### Auto-sizing Feature

The `autoSize` prop automatically determines the best card size:
- **With action buttons**: Uses `default` variant (360px height)
- **Without action buttons**: Uses `browse` variant (280px height)

This ensures optimal card heights for different use cases without manual variant selection.

### Usage Examples

#### Basic Usage (Auto-sizing)
```jsx
<OrganizationCard
  organization={org}
  onClick={() => handleClick(org)}
  autoSize={true}
/>
```

#### With Action Buttons
```jsx
<OrganizationCard
  organization={org}
  onClick={() => handleClick(org)}
  actionButtons={
    <button onClick={() => handleJoin(org._id)}>
      Request to Join
    </button>
  }
/>
```

#### Specific Variant
```jsx
<OrganizationCard
  organization={org}
  onClick={() => handleClick(org)}
  variant="compact"
  showStats={false}
/>
```

### Organization Data Structure

The component expects an organization object with the following properties:

```javascript
{
  _id: String,
  name: String,
  description: String,
  logo: String, // File path
  logoUrl: String, // Direct URL
  website: String,
  city: String,
  state: String,
  headOfficeLocation: String,
  yearOfEstablishment: Number,
  focusArea: String,
  focusAreaOther: String,
  verifiedStatus: String,
  team: Array,
  events: Array,
  memberCount: Number,
  totalEvents: Number,
  upcomingEvents: Number,
  pastEvents: Number,
  volunteerImpact: Object,
  sponsorshipImpact: Object
}
```

### Logo Handling

The component automatically handles different logo scenarios:

1. **Direct URL**: Uses `logoUrl` if provided
2. **File Path**: Constructs proper server URL for uploaded logos
3. **Fallback**: Shows organization initials with building icon when no logo is available
4. **Error Handling**: Gracefully falls back to initials if logo fails to load

### Styling

- **Base Style**: Modern glassmorphism design with backdrop blur
- **Colors**: Blue to emerald gradient theme
- **Hover Effects**: Smooth transitions and shadow changes
- **Responsive**: Adapts to different screen sizes
- **Accessibility**: Proper contrast and readable text

### Integration Points

The component is used across multiple pages:

- **Volunteer Dashboard**: Organization browsing (`autoSize={true}`)
- **Organizer Dashboard**: My organizations (`autoSize={true}`)
- **Join Organization Page**: With action buttons (`autoSize={false}`)
- **Organization Public Page**: Large logo display
- **Event Creation**: Organization selection

### Best Practices

1. **Use `autoSize={true}`** for browsing and dashboard displays
2. **Use `actionButtons` prop** for cards that need interactive elements
3. **Keep descriptions concise** (automatically truncated at 120 characters)
4. **Provide complete organization data** for best visual results
5. **Use appropriate variants** for specific use cases

### Future Enhancements

- [ ] Custom color themes
- [ ] Additional layout options
- [ ] Animation variants
- [ ] Accessibility improvements
- [ ] Performance optimizations
