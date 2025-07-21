import { useAuth } from '@/components/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UserSidebar = ({ onClose }: { onClose?: () => void }) => {
  const { logout, employeeId } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchName = async () => {
      if (employeeId) {
        try {
          const res = await fetch(`http://192.168.1.26:8080/api/employee/${employeeId}`);
          const data = await res.json();
          setUserName(`${data.firstName || ''} ${data.lastName || ''}`.trim());
        } catch {
          setUserName(null);
        }
      }
    };
    fetchName();
  }, [employeeId]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleNavigate = (route: string) => {
    router.replace(route as any);
    if (onClose) {
      onClose();
    }
  };

  const menuItems = [
    { title: 'Dashboard', route: '/(user)/user-dashboard', icon: 'grid' },
    { title: 'Attendance', route: '/(user)/AttendanceOverview', icon: 'calendar' },
    { title: 'Tasks', route: '/(user)/EmployeeTask', icon: 'check-square' },
    { title: 'Events', route: '/(user)/OfficeEventPage', icon: 'calendar' },
    { title: 'HR Requests', route: '/(user)/HRRequestPage', icon: 'file' },
    { title: 'Profile', route: '/(user)/EmployeeProfile', icon: 'user' },
    { title: 'Documents', route: '/(user)/DocumentCenter', icon: 'file' },
    // Add more user-specific items here
  ];

  return (
    <SafeAreaView style={styles.sidebar}>
      <View>
        <View style={styles.header}>
          <Text style={styles.headerText}>User Panel</Text>
          {userName ? (
            <Text style={styles.subHeaderText}>{userName}</Text>
          ) : null}
        </View>
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => handleNavigate(item.route)}>
              <Feather name={item.icon as any} size={20} color="#a0aec0" />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#1a202c',
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
  },
  userImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  subHeaderText: {
    color: '#a0aec0',
    fontSize: 13,
    marginTop: 0,
    marginBottom: 2,
    paddingVertical: 0,
  },
  menu: {
    flexGrow: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  menuText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e53e3e',
    padding: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default UserSidebar; 