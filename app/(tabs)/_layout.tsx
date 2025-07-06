import { useAuth } from '@/components/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userRole } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      {userRole === 'ADMIN' ? (
        <Tabs.Screen
          name="admin-dashboard"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>🛡️</Text>,
          }}
        />
      ) : userRole === 'EMPLOYEE' ? (
        <Tabs.Screen
          name="user-dashboard"
          options={{
            title: 'User',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>👤</Text>,
          }}
        />
      ) : null}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>🔍</Text>,
        }}
      />
    </Tabs>
  );
}
