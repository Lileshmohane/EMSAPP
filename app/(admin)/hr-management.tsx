import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage"; // No longer needed
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AdminHoliday from "./AdminHoliday"; // Assuming AdminHoliday.tsx is the correct file and it's a RN component

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
  leaveDoc?: any[];
  issueType?: string;
  description?: string;
  hrdoc?: any;
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
      // REMOVED: Token check and headers
      const [leaveRes, complaintsRes] = await Promise.all([
        axios.get("http://192.168.1.12:8080/api/leaves/").catch(err => {
            console.error("Leave fetch error:", err.response?.data || err.message);
            return { data: [] };
        }),
        axios.get("http://192.168.1.12:8080/api/complaints").catch(err => {
            console.error("Complaint fetch error:", err.response?.data || err.message);
            return { data: [] };
        })
      ]);

      const formattedLeaves: HRRequest[] = Array.isArray(leaveRes.data) ? leaveRes.data.map((leave: any) => ({
        id: leave.id,
        type: "Leave Request",
        employee: {
          id: leave.employee?.id || leave.employeeId,
          name: `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim() || `Employee ID: ${leave.employeeId}`,
          email: leave.employee?.email || 'N/A',
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
      setError("Failed to fetch requests. " + (err.message || "Please check your connection."));
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
    
    try {
        // Optimistic update
        const originalRequests = requests;
        const updatedRequests = requests.map(r => 
            r.id === selectedRequest.id ? { ...r, status: newStatus, hr_remarks: responseText } : r
        );
        setRequests(updatedRequests);
        closeDetailsModal();

        // REMOVED: Token and headers
        await axios.put(
            `http://192.168.1.12:8080/api/requests/${selectedRequest.id}/status`,
            { status: newStatus, remarks: responseText }
        );
        // If API call is successful, we keep the optimistic update.
    } catch (error: any) {
        console.error("Error processing request:", error);
        // Revert on failure
        //setRequests(originalRequests); 
        Alert.alert("Error", "Failed to process request: " + (error.response?.data?.message || error.message));
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
              // REMOVED: Token and headers
              const url = request.type === "Leave Request" ? `http://192.168.1.12:8080/api/leaves/${request.id}` : `http://192.168.1.4:8080/api/complaints/${request.id}`;
              await axios.delete(url);
            } catch (error: any) {
              // Revert if deletion fails
              setRequests(originalRequests);
              Alert.alert("Error", "Failed to delete request: " + (error.response?.data?.message || error.message));
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
    <View style={styles.container}>
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
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllRequests}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>No requests found.</Text>
            </View>
          )}
        />
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
                {Object.entries(selectedRequest.details).map(([key, value]) => value && (
                  <View key={key} style={styles.detailItem}>
                    <Text style={styles.detailKey}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={styles.detailValue}>{String(value)}</Text>
                  </View>
                ))}
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
    </View>
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
