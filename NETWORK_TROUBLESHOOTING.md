# Network Troubleshooting Guide for Mobile Development

## Issue: Network Error in Mobile App but Works in Web

Your HR management leave request feature works properly in the web version but fails with a "Network Error" in the mobile app.

## Updated Code Changes Made

### 1. Platform-Specific API Configuration
- Added dynamic API URL selection based on platform (Web vs Mobile)
- Improved error handling and timeout configuration
- Added comprehensive axios interceptors for debugging

### 2. Network Diagnostics Tools
- Created `NetworkHelper` class for connectivity testing
- Added "Network Test" button in error states
- Added troubleshooting tips accessible from the app

### 3. Enhanced Error Handling
- Better error messages with specific guidance
- Retry functionality with detailed error context
- Optimistic updates with rollback capability

## Common Solutions

### Option 1: Find Your Computer's IP Address
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```
Then update the IP address in `getApiBaseUrl()` function.

### Option 2: Use ngrok for Development
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 8080
```
Then use the ngrok URL in your mobile app configuration.

### Option 3: Use a Production Server
Deploy your API to a cloud service and use that URL for mobile testing.

## Testing Steps

1. **Test Network Connectivity**: Use the "Network Test" button when errors occur
2. **Check Server Accessibility**: Ensure your mobile device can reach the server IP
3. **Verify Firewall Settings**: Make sure port 8080 is open on your server
4. **Check Network Configuration**: Ensure both devices are on the same network

## Debugging Tips

1. Check the Metro/Expo logs for detailed network errors
2. Use the Network Test feature to diagnose connectivity issues
3. Try accessing your API URL directly in the mobile browser
4. Verify that your server is actually running and accessible

## Key Files Modified

- `app/(admin)/hr-management.tsx` - Enhanced with platform-specific networking
- `utils/networkHelper.tsx` - New diagnostic utility
- Added comprehensive error handling and retry mechanisms

## Quick Fix Commands

```bash
# Check if your server is running
curl http://192.168.1.17:8080/api/leaves/

# Test from your mobile device browser
# Open: http://192.168.1.17:8080/api/leaves/

# Use ngrok (recommended for development)
ngrok http 8080
# Then update API_BASE_URL to use the ngrok HTTPS URL
```

## Next Steps

1. Run your app and trigger a network error
2. Use the "Network Test" button to diagnose the issue
3. Check the "View Tips" for more troubleshooting options
4. Update your API configuration based on the diagnostic results
