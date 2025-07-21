import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage"; // No longer needed
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as FileSystem from 'expo-file-system';
import { useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AdminHoliday from "./AdminHoliday"; // Assuming AdminHoliday.tsx is the correct file and it's a RN component
import { NetworkHelper } from "../../utils/networkHelper";
import { getApiBaseUrl } from "../../config/api";

// Interfaces for type safety
interface Employee {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
}

interface RequestDetails {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  leaveDoc?: (string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  })[] | (string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  });
  issueType?: string;
  description?: string;
  hrdoc?: string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  };
}

interface HRRequest {
  id: number | string;
  type: string;
  employee: Employee;
  submitted_date: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress" | "Completed" | "Draft";
  details: RequestDetails;
  last_updated?: string;
  hr_remarks?: string;
  downloadLink?: string;
}

const requestTypes: { [key: string]: { icon: string; description: string } } = {
  "Leave Request": { icon: "🗓️", description: "Request time off" },
  "Salary Slip Request": { icon: "💰", description: "Request salary statements" },
  "Experience/Relieving Letter": { icon: "📄", description: "Request employment documentation" },
  "Asset Request": { icon: "💻", description: "Request company equipment" },
  "ID Card Reissue": { icon: "🪪", description: "Request replacement ID card" },
  "HR Complaint/Feedback": { icon: "📝", description: "Submit complaint or feedback" },
  "Work From Home Request": { icon: "🏠", description: "Request to work remotely" },
  "Shift Change Request": { icon: "🕒", description: "Request to change working hours" },
};

const statusColors = {
  Pending: "#f0ad4e",
  Approved: "#5cb85c",
  Rejected: "#d9534f",
  Draft: "#5bc0de",
  Completed: "#34c759",
  "In Progress": "#5ac8fa",
};

const handleViewDocument = async (doc: any, fileName = 'document.pdf', mimeType = 'application/pdf') => {
  try {
    let fileUri = '';
    if (typeof doc === 'string' && doc.startsWith('http')) {
      fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.downloadAsync(doc, fileUri);
      Alert.alert('Debug', 'Downloaded file from URL: ' + fileUri);
    } else if (typeof doc === 'string' && doc.length > 100) {
      fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, doc, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('Debug', 'Wrote base64 string to file: ' + fileUri);
    } else if (doc && typeof doc === 'object' && doc.base64Doc) {
      fileUri = FileSystem.cacheDirectory + (doc.fileName || fileName);
      await FileSystem.writeAsStringAsync(fileUri, doc.base64Doc, { encoding: FileSystem.EncodingType.Base64 });
      mimeType = doc.mimeType || mimeType;
      Alert.alert('Debug', 'Wrote base64Doc object to file: ' + fileUri);
    } else {
      Alert.alert('No document', 'No valid document is attached.');
      return;
    }
    Alert.alert('Debug', `Sharing file: ${fileUri}\nMIME: ${mimeType}`);
    await Sharing.shareAsync(fileUri, { mimeType });
  } catch (e: any) {
    Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
    Alert.alert('Error', 'Could not open document.');
  }
};

// Configure axios defaults with timeout and error handling
axios.defaults.timeout = 15000; // 15 second timeout

// Platform-specific API configuration
// Removed API URL handling logic. Now using config/api.ts

// Get the API_BASE_URL
const API_BASE_URL = getApiBaseUrl();


// Configure axios with better mobile support
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for better error handling
axios.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    console.log(`Received response from:`, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response interceptor error:', error.message);
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network error - check if server is accessible from mobile device');
    }
    return Promise.reject(error);
  }
);

const AdminHRManagementNativePage = () => {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    employee: "",
  });
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkSelection, setBulkSelection] = useState<(string | number)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check network connectivity
      const [leaveRes, complaintsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaves/`).catch(err => {
            console.error("Leave fetch error:", err.response?.data || err.message);
            if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
              throw new Error('Network connection failed. Please check your internet connection.');
            }
            return { data: [] };
        }),
        axios.get(`${API_BASE_URL}/complaints`).catch(err => {
            console.error("Complaint fetch error:", err.response?.data || err.message);
            if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
              throw new Error('Network connection failed. Please check your internet connection.');
            }
            return { data: [] };
        })
      ]);

      const formattedLeaves: HRRequest[] = Array.isArray(leaveRes.data) ? leaveRes.data.map((leave: any) => ({
        id: leave.id,
        type: "Leave Request",
        employee: {
          id: leave.employee?.id || leave.employeeId,
          name: `${leave.firstName || 'Unknown'} ${leave.lastName || ''}`.trim(),
          email: leave.email || 'N/A',
          phone: leave.employee?.phone || 'N/A',
          department: leave.employee?.department || 'N/A',
          position: leave.employee?.jobTitle || 'N/A',
        },
        submitted_date: leave.startDate,
        status: leave.status || 'Pending',
        details: {
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          leaveDoc: leave.leaveDoc,
        },
        last_updated: leave.endDate,
      })) : [];

      const formattedComplaints: HRRequest[] = Array.isArray(complaintsRes.data) ? complaintsRes.data.map((complaint: any) => ({
        id: complaint.id,
        type: "HR Complaint/Feedback",
        employee: {
          id: complaint.employeeId,
          name: `${complaint.firstName || ''} ${complaint.lastName || ''}`.trim() || `Employee ID: ${complaint.employeeId}`,
          email: complaint.employee?.email || 'N/A',
          phone: complaint.employee?.phone || 'N/A',
          department: complaint.department || 'N/A',
          position: complaint.employee?.position || 'N/A',
        },
        submitted_date: complaint.submittedDate,
        status: complaint.status || 'Pending',
        details: {
          issueType: complaint.type,
          description: complaint.description,
          hrdoc: complaint.hrdoc,
        },
        last_updated: complaint.lastUpdated,
        hr_remarks: complaint.hrRemarks,
      })) : [];

      const allRequests = [...formattedLeaves, ...formattedComplaints].sort((a, b) => new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime());
      
      setRequests(allRequests);
      if (allRequests.length === 0) {
        setError("No requests found.");
      }

    } catch (err: any) {
      console.error("Error fetching all requests:", err);
      let errorMessage = "Failed to fetch requests. ";
      
      if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED' || err.message?.includes('Network')) {
        errorMessage += "Please check your internet connection and server availability.";
      } else if (err.response?.status === 404) {
        errorMessage += "API endpoint not found.";
      } else if (err.response?.status >= 500) {
        errorMessage += "Server error. Please try again later.";
      } else {
        errorMessage += err.message || "Unknown error occurred.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  const processRequest = async (action: "approve" | "reject" | "inProgress") => {
    if (!selectedRequest) return;
    setActionInProgress(true);

    const newStatus: HRRequest['status'] = action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "In Progress";
    
    // Store original state for potential rollback
    const originalRequests = requests;
    
    try {
        // Optimistic update
        const updatedRequests = requests.map(r => 
            r.id === selectedRequest.id ? { ...r, status: newStatus, hr_remarks: responseText } : r
        );
        setRequests(updatedRequests);
        closeDetailsModal();

      let url = '';
      let response = null;
      
      if (selectedRequest.type === 'Leave Request') {
        url = `${API_BASE_URL}/leaves/${selectedRequest.id}`;
        // Build leaveDto object to match backend DTO
        const nameParts = selectedRequest.employee.name ? selectedRequest.employee.name.split(' ') : ['',''];
        const leaveDto = {
          id: selectedRequest.id,
          employeeId: selectedRequest.employee.id,
          leaveType: selectedRequest.details.leaveType,
          startDate: selectedRequest.details.startDate,
          endDate: selectedRequest.details.endDate,
          reason: selectedRequest.details.reason,
          status: newStatus,
          firstName: nameParts[0] || '',
          lastName: nameParts[1] || '',
          department: selectedRequest.employee.department || ''
        };
        const formData = new FormData();
        formData.append('leaveDto', JSON.stringify(leaveDto));
        // If you have a file to update, append it; otherwise, append an empty file
        if (
          selectedRequest.details.leaveDoc &&
          Array.isArray(selectedRequest.details.leaveDoc) &&
          selectedRequest.details.leaveDoc[0] &&
          typeof selectedRequest.details.leaveDoc[0] === 'object' &&
          'uri' in selectedRequest.details.leaveDoc[0]
        ) {
          const docObj = selectedRequest.details.leaveDoc[0];
          formData.append('leaveDoc', {
            uri: docObj.uri,
            name: docObj.fileName || 'leaveDoc.pdf',
            type: docObj.mimeType || 'application/pdf',
          } as any);
        } else {
          formData.append('leaveDoc', new Blob([''], { type: 'text/plain' }), 'empty.txt');
        }
        response = await axios.put(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 15000 // 15 second timeout for processing
        });
      } else if (selectedRequest.type === 'HR Complaint/Feedback') {
        url = `${API_BASE_URL}/complaints/${selectedRequest.id}` +
          `?type=${encodeURIComponent(selectedRequest.details.issueType || "Complaint")}` +
          `&description=${encodeURIComponent(selectedRequest.details.description || "")}` +
          `&status=${encodeURIComponent(newStatus)}`;
        const formData = new FormData();
        if (
          selectedRequest.details.hrdoc &&
          typeof selectedRequest.details.hrdoc === 'object' &&
          selectedRequest.details.hrdoc.uri
        ) {
          // React Native FormData file append
          formData.append('file', {
            uri: selectedRequest.details.hrdoc.uri,
            name: selectedRequest.details.hrdoc.fileName || 'hrdoc.pdf',
            type: selectedRequest.details.hrdoc.mimeType || 'application/pdf',
          } as any);
        } else {
          formData.append('file', '');
        }
        response = await axios.put(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': '*/*',
          },
          timeout: 15000,
        });
        
      } else {
        // Generic request type
        url = `${API_BASE_URL}/requests/${selectedRequest.id}`;
        const payload = { 
          status: newStatus,
          hrRemarks: responseText
        };
        
        response = await axios.put(url, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
      }
      
      // Success feedback
      Alert.alert(
        "Success", 
        `Request ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully!`,
        [{ text: "OK" }]
      );
      
    } catch (error: any) {
      console.error("Error processing request:", error);
      
      // Revert optimistic update on failure
      setRequests(originalRequests);
      
      let errorMessage = "Failed to process request: ";
      
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        errorMessage += "Network connection failed. Please check your internet connection.";
      } else if (error.response?.status === 404) {
        errorMessage += "Request not found on server.";
      } else if (error.response?.status === 400) {
        errorMessage += "Invalid request data.";
      } else if (error.response?.status >= 500) {
        errorMessage += "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += error.message || "Unknown error occurred.";
      }
      
      Alert.alert("Network Error", errorMessage, [
        { text: "Retry", onPress: () => processRequest(action) },
        { text: "Cancel", style: "cancel" }
      ]);
      
      // Reopen modal to allow user to retry
      setShowDetailsModal(true);
    } finally {
        setActionInProgress(false);
    }
  };
  
  const handleDeleteRequest = async (request: HRRequest) => {
    Alert.alert(
      "Delete Request",
      `Are you sure you want to delete this request from ${request.employee.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic deletion
            const originalRequests = requests;
            setRequests(requests.filter(r => r.id !== request.id));
            
            try {
              const url = request.type === "Leave Request" 
                ? `${API_BASE_URL}/leaves/${request.id}` 
                : `${API_BASE_URL}/complaints/${request.id}`;
              
              await axios.delete(url, {
                timeout: 10000
              });
              
              Alert.alert("Success", "Request deleted successfully!");
              
            } catch (error: any) {
              // Revert if deletion fails
              setRequests(originalRequests);
              
              let errorMessage = "Failed to delete request: ";
              
              if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
                errorMessage += "Network connection failed.";
              } else if (error.response?.status === 404) {
                errorMessage += "Request not found.";
              } else {
                errorMessage += error.response?.data?.message || error.message || "Unknown error occurred.";
              }
              
              Alert.alert("Error", errorMessage);
            }
          },
        },
      ]
    );
  };


  const filteredRequests = requests.filter(req => {
    const statusFilter = filters.status === 'all' || req.status === filters.status;
    const typeFilter = filters.type === 'all' || req.type === filters.type;
    const searchFilter = !searchQuery || JSON.stringify(req).toLowerCase().includes(searchQuery.toLowerCase());
    return statusFilter && typeFilter && searchFilter;
  });

  const viewRequestDetails = (request: HRRequest) => {
    // Debug: log leaveDoc value
    if (request.details && request.details.leaveDoc) {
      console.log('DEBUG leaveDoc:', request.details.leaveDoc);
      Alert.alert('Debug', 'leaveDoc: ' + JSON.stringify(request.details.leaveDoc).slice(0, 200) + (JSON.stringify(request.details.leaveDoc).length > 200 ? '...' : ''));
    }
    setSelectedRequest(request);
    setResponseText(request.hr_remarks || "");
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setResponseText("");
  };

  const renderRequestItem = ({ item }: { item: HRRequest }) => (
    <TouchableOpacity onPress={() => viewRequestDetails(item)} style={styles.requestItem}>
      <View style={styles.requestItemLeft}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[item.status] }]} />
        <View>
          <Text style={styles.itemEmployeeName}>{item.employee.name}</Text>
          <Text style={styles.itemRequestType}>{requestTypes[item.type]?.icon} {item.type}</Text>
          <Text style={styles.itemDate}>{new Date(item.submitted_date).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.requestItemRight}>
        <Text style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>{item.status}</Text>
        <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HR Requests</Text>
        <TouchableOpacity onPress={fetchAllRequests}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, type, status..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterOpen(!isFilterOpen)}>
          <Ionicons name="filter" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {isFilterOpen && (
        <View style={styles.filterPanel}>
            <Picker
                selectedValue={filters.status}
                onValueChange={(itemValue) => setFilters(f => ({ ...f, status: itemValue }))}
            >
                <Picker.Item label="All Statuses" value="all" />
                {Object.keys(statusColors).map(status => (
                    <Picker.Item key={status} label={status} value={status} />
                ))}
            </Picker>
             <Picker
                selectedValue={filters.type}
                onValueChange={(itemValue) => setFilters(f => ({ ...f, type: itemValue }))}
            >
                <Picker.Item label="All Types" value="all" />
                {Object.keys(requestTypes).map(type => (
                    <Picker.Item key={type} label={type} value={type} />
                ))}
            </Picker>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.retryButton} onPress={fetchAllRequests}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: '#FF9500' }]} 
                onPress={() => NetworkHelper.showNetworkDiagnostics(API_BASE_URL)}
              >
                  <Text style={styles.retryButtonText}>Network Test</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: '#8E8E93', marginTop: 10 }]}
              onPress={() => Alert.alert(
                'Troubleshooting Tips', 
                NetworkHelper.getNetworkTroubleshootingTips().join('\n\n')
              )}
            >
                <Text style={styles.retryButtonText}>View Tips</Text>
            </TouchableOpacity>
        </View>
      ) : (
        <View>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>No requests found.</Text>
            </View>
          ) : (
            filteredRequests.map((item) => (
              <React.Fragment key={`${item.type}-${item.id}`}>
                {renderRequestItem({ item })}
              </React.Fragment>
            ))
          )}
        </View>
      )}

      <AdminHoliday />

      {selectedRequest && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showDetailsModal}
          onRequestClose={closeDetailsModal}
        >
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRequest.type} Details</Text>
              <TouchableOpacity onPress={closeDetailsModal}>
                  <Ionicons name="close" size={30} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Employee Information</Text>
                <Text>{selectedRequest.employee.name} ({selectedRequest.employee.position})</Text>
                <Text>{selectedRequest.employee.department}</Text>
                <Text>{selectedRequest.employee.email}</Text>
            </View>

            <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Request Details</Text>
                {Object.entries(selectedRequest.details).map(([key, value]) => (value && key !== 'hrdoc') && (
                  <View key={key} style={styles.detailItem}>
                    <Text style={styles.detailKey}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={styles.detailValue}>{String(value)}</Text>
                  </View>
                ))}
                {/* Document viewing logic for leaveDoc */}
                {selectedRequest.details.leaveDoc && (
                  Array.isArray(selectedRequest.details.leaveDoc)
                    ? selectedRequest.details.leaveDoc.map((doc, idx) => {
                        // Handle JSON object, string (base64), or URL
                        let fileData: string | null = null;
                        let fileName = `document_${idx}.pdf`;
                        let mimeType = 'application/pdf';
                        if (doc && typeof doc === 'object') {
                          if (doc.base64Doc) {
                            fileData = doc.base64Doc;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          } else if (doc.url) {
                            fileData = doc.url;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          }
                        } else if (
                          typeof doc === 'string' &&
                          !!doc &&
                          doc.length > 0 &&
                          doc !== 'string' && // skip placeholder
                          doc !== '[object Object]'
                        ) {
                          fileData = doc;
                        }
                        if (!fileData || fileData === 'string' || fileData === '[object Object]') {
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.actionButton, { backgroundColor: '#8E8E93', marginVertical: 4 }]}
                              onPress={() => Alert.alert('No document', 'No valid document is attached to this request.')}
                            >
                              <Text style={styles.actionButtonText}>No Document {idx + 1}</Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.actionButton, { backgroundColor: '#007AFF', marginVertical: 4 }]}
                            onPress={async () => {
                              try {
                                let fileUri = '';
                                if (typeof fileData === 'string' && fileData.startsWith('http')) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  const downloadRes = await FileSystem.downloadAsync(fileData, fileUri);
                                  fileUri = downloadRes.uri;
                                } else if (typeof fileData === 'string' && fileData.length > 100) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  await FileSystem.writeAsStringAsync(fileUri, fileData, { encoding: FileSystem.EncodingType.Base64 });
                                } else {
                                  Alert.alert('Error', 'Document data is invalid or too short.');
                                  return;
                                }
                                await Sharing.shareAsync(fileUri, { mimeType });
                              } catch (e: any) {
                                Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
                              }
                            }}
                          >
                            <Text style={styles.actionButtonText}>View Document {idx + 1}</Text>
                          </TouchableOpacity>
                        );
                      })
                    : (() => {
                        const doc = selectedRequest.details.leaveDoc;
                        let fileData: string | null = null;
                        let fileName = 'document.pdf';
                        let mimeType = 'application/pdf';
                        if (doc && typeof doc === 'object') {
                          if (doc.base64Doc) {
                            fileData = doc.base64Doc;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          } else if (doc.url) {
                            fileData = doc.url;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          }
                        } else if (
                          typeof doc === 'string' &&
                          !!doc &&
                          doc.length > 0 &&
                          doc !== 'string' &&
                          doc !== '[object Object]'
                        ) {
                          fileData = doc;
                        }
                        if (!fileData || fileData === 'string' || fileData === '[object Object]') {
                          return (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#8E8E93', marginVertical: 4 }]}
                              onPress={() => Alert.alert('No document', 'No valid document is attached to this request.')}
                            >
                              <Text style={styles.actionButtonText}>No Document</Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#007AFF', marginVertical: 4 }]}
                            onPress={async () => {
                              try {
                                let fileUri = '';
                                if (typeof fileData === 'string' && fileData.startsWith('http')) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  const downloadRes = await FileSystem.downloadAsync(fileData, fileUri);
                                  fileUri = downloadRes.uri;
                                } else if (typeof fileData === 'string' && fileData.length > 100) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  await FileSystem.writeAsStringAsync(fileUri, fileData, { encoding: FileSystem.EncodingType.Base64 });
                                } else {
                                  Alert.alert('Error', 'Document data is invalid or too short.');
                                  return;
                                }
                                await Sharing.shareAsync(fileUri, { mimeType });
                              } catch (e: any) {
                                Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
                              }
                            }}
                          >
                            <Text style={styles.actionButtonText}>View Document</Text>
                          </TouchableOpacity>
                        );
                      })()
                )}
                {/* Document viewing logic for hrdoc */}
                {selectedRequest.details.hrdoc && (
                  (() => {
                    const hrdoc = selectedRequest.details.hrdoc;
                    let fileName = 'hrdoc.pdf';
                    let mimeType = 'application/pdf';
                    let icon = '📄';
                    let isBase64 = false;
                    let hrdocUrl = null;
                    // Detect type and set icon
                    if (typeof hrdoc === 'string') {
                      if (hrdoc.startsWith('http')) {
                        hrdocUrl = hrdoc;
                      } else if (hrdoc.length > 100) {
                        isBase64 = true;
                      }
                    } else if (hrdoc && typeof hrdoc === 'object') {
                      if (hrdoc.url && typeof hrdoc.url === 'string' && hrdoc.url.startsWith('http')) {
                        hrdocUrl = hrdoc.url;
                        fileName = hrdoc.fileName || fileName;
                        mimeType = hrdoc.mimeType || mimeType;
                      } else if (hrdoc.base64Doc && typeof hrdoc.base64Doc === 'string' && hrdoc.base64Doc.length > 100) {
                        isBase64 = true;
                        fileName = hrdoc.fileName || fileName;
                        mimeType = hrdoc.mimeType || mimeType;
                      }
                    }
                    // Icon logic
                    if (mimeType.includes('pdf')) icon = '📄';
                    else if (mimeType.includes('word') || fileName.match(/\.docx?$/i)) icon = '📝';
                    else if (mimeType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif)$/i)) icon = '🖼️';
                    else icon = '📁';
                    // Render
                    if (hrdocUrl) {
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                          <Text style={{ fontSize: 22, marginRight: 8 }}>{icon}</Text>
                          <Text style={{ marginRight: 12, fontWeight: 'bold' }}>{fileName}</Text>
                          <TouchableOpacity onPress={async () => {
                            try {
                              const fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                              const downloadRes = await FileSystem.downloadAsync(hrdocUrl, fileUri);
                              await Sharing.shareAsync(downloadRes.uri, { mimeType });
                            } catch (e) {
                              Alert.alert('Error', 'Could not open HR document.');
                            }
                          }} style={{ backgroundColor: '#007AFF', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>View HR Document</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    } else if (isBase64) {
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                          <Text style={{ fontSize: 22, marginRight: 8 }}>{icon}</Text>
                          <Text style={{ marginRight: 12, fontWeight: 'bold' }}>{fileName}</Text>
                          <TouchableOpacity onPress={async () => {
                            try {
                              let base64Data = '';
                              if (typeof hrdoc === 'string') base64Data = hrdoc;
                              else if (hrdoc && typeof hrdoc === 'object') base64Data = hrdoc.base64Doc || '';
                              const ext = mimeType.startsWith('application/pdf') ? '.pdf' : mimeType.startsWith('image/') ? '.jpg' : '';
                              const fileUri = FileSystem.cacheDirectory + (fileName.replace(/[^a-zA-Z0-9]/g, '_') || 'hrdoc') + ext;
                              await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                              await Sharing.shareAsync(fileUri, { mimeType });
                            } catch (e) {
                              Alert.alert('Error', 'Could not open HR document.');
                            }
                          }} style={{ backgroundColor: '#007AFF', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>View HR Document</Text>
                  </TouchableOpacity>
                        </View>
                      );
                    } else {
                      return (
                        <Text style={{ color: '#8E8E93', marginVertical: 8 }}>No valid HR document attached.</Text>
                      );
                    }
                  })()
                )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>HR Response</Text>
              <TextInput
                style={styles.responseTextInput}
                placeholder="Enter response or notes..."
                value={responseText}
                onChangeText={setResponseText}
                multiline
              />
            </View>
            
            <View style={styles.modalFooter}>
                {selectedRequest.status === 'Pending' && (
                    <>
                        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => processRequest('reject')} disabled={actionInProgress}>
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => processRequest('approve')} disabled={actionInProgress}>
                            <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                    </>
                )}
                 <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteRequest(selectedRequest)}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  controlsContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9E9EB', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 40 },
  filterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 },
  filterButtonText: { color: '#007AFF', marginLeft: 5, fontSize: 16 },
  filterPanel: { paddingHorizontal: 16 },
  listContainer: { paddingBottom: 20 },
  requestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
  requestItemLeft: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: '100%', marginRight: 12, borderRadius: 4 },
  itemEmployeeName: { fontSize: 16, fontWeight: '600' },
  itemRequestType: { color: '#8E8E93', marginTop: 2 },
  itemDate: { color: '#8E8E93', marginTop: 2, fontSize: 12 },
  requestItemRight: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 8, overflow: 'hidden' },
  emptyListContainer: { marginTop: 50, alignItems: 'center' },
  emptyListText: { fontSize: 18, color: '#8E8E93' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 10 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16 },
  // Modal Styles
  modalContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 20 : 50, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalSection: { marginTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailKey: { color: '#8E8E93', textTransform: 'capitalize' },
  detailValue: { fontWeight: '500' },
  responseTextInput: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, marginBottom: 50 },
  actionButton: { padding: 15, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },
  approveButton: { backgroundColor: '#34C759' },
  rejectButton: { backgroundColor: '#FF3B30' },
  deleteButton: { backgroundColor: '#8E8E93' },
});

export default AdminHRManagementNativePage;
