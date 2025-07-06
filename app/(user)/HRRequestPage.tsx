import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

axios.defaults.baseURL = 'http://192.168.1.12:8080';

const HRRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState({
    type: '',
    description: '',
    date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/complaints');
      setRequests(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load HR requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm(prev => ({ ...prev, date: selectedDate }));
    }
  };

  const handleSubmit = async () => {
    if (!form.type || !form.description) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setSubmitting(true);
      await axios.post('/api/complaints', {
        type: form.type,
        description: form.description,
        date: form.date.toISOString().split('T')[0],
      });
      setForm({ type: '', description: '', date: new Date() });
      setError(null);
      fetchRequests();
    } catch (err) {
      setError('Failed to submit HR request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.heading}>HR Requests</Text>
        <Text style={styles.sectionTitle}>Submit New Request</Text>
        <View style={styles.formGroup}>
          <TextInput
            style={styles.input}
            placeholder="Request Type (e.g. Leave, Equipment, etc.)"
            value={form.type}
            onChangeText={text => handleInputChange('type', text)}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Description"
            value={form.description}
            onChangeText={text => handleInputChange('description', text)}
            multiline
          />
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnText}>Date: {form.date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={form.date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
          </TouchableOpacity>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <Text style={styles.sectionTitle}>My Requests</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
        ) : requests.length === 0 ? (
          <Text style={styles.noRequests}>No HR requests found.</Text>
        ) : (
          requests.map(request => (
            <TouchableOpacity key={request.id} style={styles.card} onPress={() => { setSelectedRequest(request); setShowModal(true); }}>
              <Text style={styles.cardTitle}>{request.type}</Text>
              <Text style={styles.cardDesc}>{request.description}</Text>
              <Text style={styles.cardDate}>Date: {request.date}</Text>
              <Text style={styles.cardStatus}>Status: {request.status || 'Pending'}</Text>
            </TouchableOpacity>
          ))
        )}
        <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              {selectedRequest && (
                <>
                  <Text style={styles.modalTitle}>{selectedRequest.type}</Text>
                  <Text style={styles.modalDesc}>{selectedRequest.description}</Text>
                  <Text>Date: {selectedRequest.date}</Text>
                  <Text>Status: {selectedRequest.status || 'Pending'}</Text>
                </>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f2f6ff' },
  main: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#1a1a1a' },
  formGroup: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 8, marginBottom: 12, fontSize: 14 },
  dateBtn: { backgroundColor: '#e1e1e1', borderRadius: 8, padding: 10, marginBottom: 12 },
  dateBtnText: { color: '#333' },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  noRequests: { color: '#999', textAlign: 'center', marginVertical: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e1e1' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  cardStatus: { fontSize: 12, color: '#007AFF', marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  closeBtn: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  closeBtnText: { fontSize: 20, color: '#c62828' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
});

export default HRRequestPage; 