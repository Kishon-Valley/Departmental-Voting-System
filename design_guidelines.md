# Departmental Election Website - Design Guidelines

## Design Approach
**System-Based Approach** using Material Design principles adapted for civic trust and accessibility. This election platform prioritizes clarity, security perception, and efficient information architecture over visual flair.

Reference inspiration: Government platforms like Vote.gov for trustworthiness, Linear for clean data presentation, and Stripe for form clarity.

## Core Design Principles
- **Trust & Transparency**: Clean, professional aesthetic that conveys security and legitimacy
- **Clarity First**: Every element serves a functional purpose; no decorative excess
- **Democratic Access**: Maximum accessibility and mobile-first responsive design
- **Information Hierarchy**: Clear visual distinction between public info and authenticated actions

## Typography System

**Font Stack**: 
- Primary: Inter (Google Fonts) - body text, forms, data
- Accent: Poppins (Google Fonts) - headings, candidates names

**Hierarchy**:
- H1: text-4xl md:text-5xl font-bold (Page titles)
- H2: text-3xl md:text-4xl font-semibold (Section headers)
- H3: text-2xl font-semibold (Card headers, candidate names)
- Body: text-base leading-relaxed (Main content)
- Small: text-sm (Meta info, timestamps, helper text)

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16 consistently
- Component padding: p-6 or p-8
- Section spacing: py-12 or py-16
- Card gaps: gap-6 or gap-8
- Tight spacing: space-y-4

**Grid Structure**:
- Max container width: max-w-7xl mx-auto
- Candidates grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Admin dashboard: Two-column sidebar layout (aside + main)
- Results charts: Single column on mobile, 2-column on desktop

## Component Library

### Navigation
- **Public Nav**: Horizontal bar with logo left, links center (Home, Candidates, Results, Contact), Login/Dashboard button right
- **Admin Nav**: Persistent sidebar with icon+label navigation items
- Sticky header on scroll with subtle shadow
- Mobile: Hamburger menu with slide-out drawer

### Hero Section (Home Page)
- **Large Hero Image**: University/department building or students voting (professional stock photo)
- Centered overlay content with backdrop-blur on text container
- H1 title + subtitle + dual CTAs ("View Candidates" primary, "Learn More" secondary)
- Height: min-h-[500px] md:min-h-[600px]

### Cards
- **Candidate Cards**: Photo top (aspect-square), name, position, manifesto snippet, "View Details" link
- **Info Cards**: Icon, title, description pattern for features/announcements
- Consistent border, subtle shadow on hover
- Padding: p-6, rounded-lg

### Forms (Voting, Login, Contact)
- Labels above inputs, required indicators
- Full-width inputs with clear focus states
- Helper text below inputs in text-sm
- Primary button at bottom-right
- Form max-width: max-w-2xl for readability

### Countdown Timer (Home)
- Large display showing Days:Hours:Minutes:Seconds
- Grid of 4 columns, each with number + label
- Prominent placement below hero

### Results Visualization
- Bar charts for vote counts per position (Chart.js)
- Pie chart for percentage breakdown
- Data tables with sortable columns
- Winner badges/highlights

### Admin Dashboard
- Sidebar navigation (240px wide)
- Data tables with actions (Edit, Delete icons)
- Stats cards showing key metrics (Total Votes, Active Candidates, etc.)
- Action buttons top-right of sections

### Status Indicators
- Election Status badge: "Upcoming" (blue), "Active" (green), "Closed" (gray)
- Verification status: checkmark icons for verified students
- Vote confirmation: success state with checkmark animation

### Buttons
- Primary: Solid background for main actions
- Secondary: Outline style for secondary actions
- Icon buttons for admin actions (edit, delete, etc.)
- Size hierarchy: btn-lg for CTAs, btn-md default, btn-sm for inline actions

## Page Layouts

### Home Page (4-5 sections)
1. Hero with election overview + countdown
2. Key dates/timeline section
3. Quick stats (Total Positions, Candidates, Eligible Voters)
4. How to Vote (3-step visual guide)
5. Announcements/Latest updates

### Candidates Page
- Filter bar at top (dropdown for position filtering)
- Grid layout of candidate cards
- Modal or dedicated page for full candidate details

### Voting Page (Authenticated)
- Position-by-position layout
- Radio button selection per position
- Candidate info visible during selection
- Review screen before final submission
- Confirmation screen post-vote

### Results Page
- Toggle between chart and table view
- Filter by position
- Export functionality (admin only)
- Real-time update indicator when live

### Contact Page
- Two-column: Contact form left, FAQ accordion right
- Support email and office hours displayed
- Success message after form submission

## Accessibility Implementation
- WCAG AA compliance mandatory
- Keyboard navigation for all interactive elements
- ARIA labels on all icons and complex components
- High contrast text (minimum 4.5:1 ratio)
- Focus indicators visible and clear
- Form validation with clear error messages

## Images
- **Hero Image**: Professional photo of university/department building or student civic engagement scene (1920x600px)
- **Candidate Photos**: Headshots with consistent aspect ratio (square, 400x400px)
- **About/Process Images**: Icons or illustrations for voting steps (optional decorative)
- All images should have alt text for accessibility

## Trust & Security Signals
- SSL padlock visible in browser (ensure HTTPS)
- "Secure Voting" badge near voting interface
- Clear privacy policy link in footer
- Election committee contact information prominent
- Timestamp displays for vote submission confirmations

## Responsive Breakpoints
- Mobile: < 768px (single column, stacked navigation)
- Tablet: 768px - 1024px (2-column grids)
- Desktop: > 1024px (3-column grids, full sidebar)