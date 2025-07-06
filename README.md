# Em - Employee Management App

A React Native application built with Expo for managing employees, attendance, tasks, and events.

## Features

### Admin Features
- **Dashboard**: Overview of employee statistics and recent activities
- **Employee Management**: Add, edit, and manage employee information
- **Attendance Tracking**: Monitor employee attendance and time tracking
- **Task Management**: Create and assign tasks to employees
- **Event Management**: Create and manage office events with images

### User Features
- **User Dashboard**: Personal dashboard for regular employees
- **Profile Management**: View and update personal information

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Em
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# For Android
npm run android

# For iOS
npm run ios

# For web
npm run web
```

## API Configuration

The app connects to a backend API. Update the API URL in the following files:

- `app/(admin)/add-office-event.tsx` - Line 20: `const API_URL = "http://192.168.1.4:8080/api/events";`
- Other API endpoints in respective files

Make sure your backend server is running and accessible from your device/emulator.

## Events Feature

The Events feature allows administrators to:

- **Create Events**: Add new office events with title, description, date, location, and image
- **Edit Events**: Modify existing event details
- **Delete Events**: Remove events from the system
- **Search Events**: Filter events by name
- **View Event Details**: See complete event information

### Event Management Workflow

1. Navigate to the Admin panel
2. Click on "Events" in the sidebar
3. Use "Create Event" to add new events
4. Fill in all required fields (title, description, date, location)
5. Optionally add an event image
6. Save the event

### Image Upload

The app supports image upload for events:
- Uses `expo-image-picker` for image selection
- Supports common image formats (JPEG, PNG)
- Images are automatically resized and optimized
- Base64 encoding for server storage

## Dependencies

### Core Dependencies
- `expo`: ~53.0.12
- `react`: 19.0.0
- `react-native`: 0.79.4
- `expo-router`: ~5.1.0

### Key Features Dependencies
- `@react-native-community/datetimepicker`: ^8.4.2 (for date selection)
- `expo-image-picker`: ^16.1.4 (for image selection)
- `axios`: ^0.27.2 (for API calls)
- `@expo/vector-icons`: ^14.1.0 (for icons)

## Project Structure

```
Em/
├── app/
│   ├── (admin)/           # Admin-specific screens
│   │   ├── add-office-event.tsx
│   │   ├── admin-dashboard.tsx
│   │   ├── employees.tsx
│   │   └── ...
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Tab navigation screens
│   └── (user)/            # User-specific screens
├── components/            # Reusable components
├── constants/             # App constants
├── hooks/                 # Custom hooks
├── utils/                 # Utility functions
└── assets/               # Images and fonts
```

## Troubleshooting

### Common Issues

1. **Image Picker Not Working**
   - Ensure camera roll permissions are granted
   - Check that `expo-image-picker` is properly installed

2. **API Connection Issues**
   - Verify the API server is running
   - Check the API URL configuration
   - Ensure network connectivity

3. **Navigation Issues**
   - Clear the app cache and restart
   - Check that all route files exist

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
