# Telegram Session Manager Frontend

A modern, responsive React frontend for the Telegram Session Manager SaaS application.

## Features

- **Modern UI/UX**: Clean, professional interface with Tailwind CSS
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Drag & Drop**: Easy file upload with visual feedback
- **Real-time Feedback**: Toast notifications and loading states
- **Comprehensive Dashboard**: Overview of all features and quick actions
- **Detailed Results**: Rich result displays with status indicators and summaries

## Pages

### Dashboard
- Overview of all features
- Quick action cards
- Getting started guide
- Statistics display

### Session Validator
- Upload and validate Telegram session files
- Check authentication status
- Display user information (ID, phone, username)
- Detailed error reporting

### Health Checker
- Check session health using SpamBot
- Detect account limitations and bans
- Display SpamBot responses
- Health status indicators

### Name Manager
- Bulk update display names
- Individual name customization
- Default name setting
- Success/error tracking

### Bio Manager
- Mass update bio text
- Character limit validation
- Real-time character count
- Detailed results display

### Profile Pictures
- Upload single image for multiple accounts
- Image preview
- Support for JPG, PNG, GIF formats
- Progress tracking

### Login Codes
- Extract login codes from message history
- Search through recent messages
- Pattern matching for various code formats
- Detailed code information

### Auth Codes
- Extract authentication codes from my.telegram.org
- Search official Telegram accounts
- Long alphanumeric string detection
- Message preview and metadata

## Technology Stack

- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **React Dropzone**: Drag & drop file uploads
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client for API calls
- **Framer Motion**: Smooth animations

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000
```

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## API Integration

The frontend communicates with the backend through the following endpoints:

- `POST /validate/` - Session validation
- `POST /health/` - Health checking
- `POST /name/set` - Name updates
- `POST /bio/set` - Bio updates
- `POST /pfp/set` - Profile picture updates
- `POST /login_code/` - Login code extraction
- `POST /auth_code/` - Auth code extraction
- `POST /zip/preview` - ZIP file preview

## File Structure

```
src/
├── components/
│   ├── Layout.js          # Main layout with sidebar
│   └── FileUpload.js      # Reusable file upload component
├── pages/
│   ├── Dashboard.js       # Main dashboard
│   ├── SessionValidator.js # Session validation
│   ├── HealthChecker.js   # Health checking
│   ├── NameManager.js     # Name management
│   ├── BioManager.js      # Bio management
│   ├── ProfilePictureManager.js # Profile pictures
│   ├── CodeExtractor.js   # Login code extraction
│   └── AuthCodeExtractor.js # Auth code extraction
├── services/
│   └── api.js            # API service functions
├── App.js                # Main app component
├── index.js              # Entry point
└── index.css             # Global styles
```

## Key Components

### FileUpload Component
- Drag & drop functionality
- File type validation
- Multiple file support
- Visual feedback
- File removal

### Layout Component
- Responsive sidebar navigation
- Mobile-friendly design
- Active page highlighting
- Clean routing

### API Service
- Centralized API calls
- Error handling
- Request/response interceptors
- FormData handling

## Styling

The application uses Tailwind CSS with custom components:

- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary action buttons
- `.card` - Card containers
- `.input-field` - Form inputs
- `.status-success` - Success states
- `.status-error` - Error states
- `.status-warning` - Warning states
- `.status-info` - Info states

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Code Style
- ESLint configuration included
- Prettier formatting
- Consistent component structure
- Proper prop validation

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Deployment

The frontend can be deployed to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: `npm run deploy`
- **AWS S3**: Upload build folder
- **Firebase Hosting**: `firebase deploy`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Telegram Session Manager SaaS application. 