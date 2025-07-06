import { useAuth } from '@/components/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, loading, userRole } = useAuth();

  // Show loading screen while checking authentication status
  if (loading) {
    return null;
  }

  // Redirect based on authentication status and user role
  if (isAuthenticated) {
    if (userRole === 'ADMIN') {
      return <Redirect href="/(admin)" />;
    } else if (userRole === 'EMPLOYEE') {
      return <Redirect href="/(user)" />;
    } else {
      return <Redirect href="/(auth)/login" />;
    }
  } else {
    return <Redirect href="/(auth)/login" />;
  }
} 