import AdminSidebar from '@/components/AdminSidebar';
import { Feather } from '@expo/vector-icons';
import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const SIDEBAR_WIDTH = 280;
const MOBILE_BREAKPOINT = 768;

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarVisible(false);
  }, [pathname]);

  return (
    <View style={styles.container}>
      {/* Sidebar for desktop/tablet */}
      {!isMobile && <AdminSidebar />}
      
      {/* Header with hamburger for mobile */}
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
            <Feather name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image 
              source={require('../../assets/images/adoptive-icon.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Admin Portal</Text>
          </View>
        </View>
      )}
      
      {/* Sidebar as modal for mobile */}
      {isMobile && (
        <Modal
          visible={sidebarVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSidebarVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.sidebarModal}>
              <AdminSidebar onClose={() => setSidebarVisible(false)} />
            </View>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setSidebarVisible(false)}
            />
          </View>
        </Modal>
      )}
      
      <View style={[styles.content, isMobile && styles.mobileContent]}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f2f6ff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f2f6ff',
  },
  mobileContent: {
    paddingTop: 90, // Match new header height
  },
  mobileHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 90,
    backgroundColor: '#0a7ea4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  menuBtn: {
    marginRight: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 64,
    height: 64,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarModal: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: 'transparent',
  },
}); 