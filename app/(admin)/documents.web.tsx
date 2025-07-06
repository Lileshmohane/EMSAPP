import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useAuth } from '../../components/AuthContext';

const API_BASE_URL = 'http://192.168.1.12:8080/api';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}

interface Document {
  id: number;
  name: string;
  mimeType: string;
  base64Doc: string;
  docType?: string;
  uploadDate?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) {
    return <Icon name="file-pdf-o" size={30} color="#D9534F" />;
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return <Icon name="file-word-o" size={30} color="#428BCA" />;
  } else if (mimeType.includes('image')) {
    return <Icon name="file-image-o" size={30} color="#5CB85C" />;
  } else {
    return <Icon name="file-o" size={30} color="#777" />;
  }
};

const AdminDocumentsPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [companyDocs, setCompanyDocs] = useState<Document[]>([]);
  const [personalDocs, setPersonalDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { isAuthenticated } = useAuth();
  const [uploadFiles, setUploadFiles] = useState<{ [key: string]: File | null }>({});
  const fileInputRefs = {
    offerLetterDoc: useRef<HTMLInputElement>(null),
    latestPaySlipDoc: useRef<HTMLInputElement>(null),
    doc: useRef<HTMLInputElement>(null),
    personalDoc: useRef<HTMLInputElement>(null),
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get<Employee[]>(`${API_BASE_URL}/employee`);
      setEmployees(response.data);
      if (response.data.length > 0) {
        setSelectedEmployee(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      Toast.show({ type: 'error', text1: 'Failed to fetch employees' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployeeDocuments = useCallback(async (employeeId: number) => {
    try {
      setLoading(true);
      // Fetch company documents
      const companyResponse = await axios.get(`${API_BASE_URL}/employee-images/emp/${employeeId}`);
      const companyDoc = companyResponse.data;
      const processedCompanyDocs: Document[] = [];
      const processedBase64Data = new Set<string>();

      if (companyDoc.offerLetterDoc && !processedBase64Data.has(companyDoc.offerLetterDoc)) {
        processedBase64Data.add(companyDoc.offerLetterDoc);
        processedCompanyDocs.push({
          id: companyDoc.id,
          name: 'Offer Letter',
          mimeType: 'application/pdf',
          base64Doc: companyDoc.offerLetterDoc,
          docType: 'offerLetterDoc',
        });
      }
      if (companyDoc.latestPaySlipDoc && !processedBase64Data.has(companyDoc.latestPaySlipDoc)) {
        processedBase64Data.add(companyDoc.latestPaySlipDoc);
        processedCompanyDocs.push({
          id: companyDoc.id,
          name: 'Latest Payslip',
          mimeType: 'application/pdf',
          base64Doc: companyDoc.latestPaySlipDoc,
          docType: 'latestPaySlipDoc',
        });
      }
      if (companyDoc.doc && !processedBase64Data.has(companyDoc.doc)) {
        processedBase64Data.add(companyDoc.doc);
        processedCompanyDocs.push({
          id: companyDoc.id,
          name: 'Additional Document',
          mimeType: 'application/pdf',
          base64Doc: companyDoc.doc,
          docType: 'doc',
        });
      }
      setCompanyDocs(processedCompanyDocs);

      // Fetch personal documents
      const personalResponse = await axios.get(`${API_BASE_URL}/documents/employee/${employeeId}`);
      const personalData = Array.isArray(personalResponse.data) ? personalResponse.data : [];
      const processedPersonalDocs = personalData
        .map((doc: any) => ({
          ...doc,
          mimeType: doc.type || 'application/octet-stream',
          base64Doc: doc.data,
        }))
        .filter((doc: any) => doc.base64Doc != null);
      setPersonalDocs(processedPersonalDocs);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      Toast.show({ type: 'error', text1: 'Failed to fetch documents' });
      setCompanyDocs([]);
      setPersonalDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      Toast.show({ type: 'error', text1: 'Please login to access this page' });
      return;
    }
    fetchEmployees();
  }, [isAuthenticated, fetchEmployees]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeDocuments(selectedEmployee);
    }
  }, [selectedEmployee, fetchEmployeeDocuments]);

  const handleFilePick = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setUploadFiles(prev => ({ ...prev, [docType]: file }));
    }
  };

  const handleCompanyDocUpload = async (docType: string) => {
    const file = uploadFiles[docType];
    if (!file || !selectedEmployee) {
      Toast.show({ type: 'error', text1: 'Please select a file and employee' });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append(docType, file);
      let documentId = null;
      let hasExistingDoc = false;
      try {
        const existingDoc = await axios.get(`${API_BASE_URL}/employee-images/emp/${selectedEmployee}`);
        if (existingDoc.data && existingDoc.data.id) {
          documentId = existingDoc.data.id;
          hasExistingDoc = true;
        }
      } catch (err) {}
      const url = hasExistingDoc
        ? `${API_BASE_URL}/employee-images/${documentId}?empId=${selectedEmployee}`
        : `${API_BASE_URL}/employee-images`;
      const method = hasExistingDoc ? 'put' : 'post';
      if (!hasExistingDoc) {
        formData.append('empId', String(selectedEmployee));
      }
      await axios({
        url,
        method,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Toast.show({ type: 'success', text1: `✅ Document submitted!` });
      setUploadFiles(prev => ({ ...prev, [docType]: null }));
      fetchEmployeeDocuments(selectedEmployee);
    } catch (err: any) {
      console.error('Upload failed:', err);
      Toast.show({ type: 'error', text1: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handlePersonalDocUpload = async () => {
    const file = uploadFiles.personalDoc;
    if (!file || !selectedEmployee) {
      Toast.show({ type: 'error', text1: 'Please select a file and employee' });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', String(selectedEmployee));
      await axios.post(`${API_BASE_URL}/documents/upload/${selectedEmployee}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Toast.show({ type: 'success', text1: `✅ Personal document submitted!` });
      setUploadFiles(prev => ({ ...prev, personalDoc: null }));
      fetchEmployeeDocuments(selectedEmployee);
    } catch (err: any) {
      console.error('Upload failed:', err);
      Toast.show({ type: 'error', text1: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (docName: string, onDelete: () => void) => {
    if (window.confirm(`Are you sure you want to delete ${docName}?`)) {
      onDelete();
    }
  };

  const handleDeleteCompanyDoc = async (doc: Document) => {
    confirmDelete(doc.name, async () => {
      try {
        await axios.delete(`${API_BASE_URL}/employee-images/${doc.id}`);
        Toast.show({ type: 'success', text1: 'Company document deleted!' });
        if (selectedEmployee) fetchEmployeeDocuments(selectedEmployee);
      } catch (err) {
        console.error('Delete failed:', err);
        Toast.show({ type: 'error', text1: 'Failed to delete company document' });
      }
    });
  };

  const handleDeletePersonalDoc = async (docId: number) => {
    confirmDelete('this personal document', async () => {
      try {
        await axios.delete(`${API_BASE_URL}/documents/employee/${selectedEmployee}/document/${docId}`);
        Toast.show({ type: 'success', text1: 'Personal document deleted!' });
        if (selectedEmployee) fetchEmployeeDocuments(selectedEmployee);
      } catch (err) {
        console.error('Delete failed:', err);
        Toast.show({ type: 'error', text1: 'Failed to delete personal document' });
      }
    });
  };

  const getEmployeeName = (empId: number) => {
    const employee = employees.find(emp => emp.id === empId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const handleViewDocument = (doc: Document) => {
    Toast.show({ type: 'info', text1: 'Viewing documents is not supported on web.' });
  };

  if (loading && !employees.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  const renderDocCard = (doc: Document, isCompanyDoc: boolean) => (
    <View key={isCompanyDoc ? `${doc.id}-${doc.docType}`: doc.id} style={styles.documentCard}>
      <View style={styles.documentIcon}>{getFileIcon(doc.mimeType)}</View>
      <View style={styles.documentInfo}>
        <Text style={styles.docName}>{doc.name}</Text>
        <Text>Type: {doc.mimeType.split('/').pop()?.toUpperCase()}</Text>
        <Text>Employee: {selectedEmployee ? getEmployeeName(selectedEmployee) : 'N/A'}</Text>
        {doc.uploadDate && (
          <Text>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</Text>
        )}
      </View>
      <View style={styles.documentActions}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#ccc' }]} onPress={() => handleViewDocument(doc)}>
          <Icon name="eye" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => isCompanyDoc ? handleDeleteCompanyDoc(doc) : handleDeletePersonalDoc(doc.id)}>
          <Icon name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUploadControls = (docType: string, label: string) => (
    <View style={styles.uploadControls}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="file"
        ref={fileInputRefs[docType]}
        style={{ marginBottom: 10 }}
        onChange={e => handleFilePick(docType, e)}
      />
      {uploadFiles[docType] && (
        <Text style={styles.fileName}>Selected: {uploadFiles[docType]?.name}</Text>
      )}
      <TouchableOpacity
        style={[styles.button, (!uploadFiles[docType] || uploading) && styles.disabledButton]}
        onPress={() => docType === 'personalDoc' ? handlePersonalDocUpload() : handleCompanyDocUpload(docType)}
        disabled={!uploadFiles[docType] || uploading}
      >
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>📁 Admin Document Center (Web)</Text>
        </View>
        <View style={styles.employeeSelector}>
          <Text style={styles.label}>Select Employee:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedEmployee}
              onValueChange={(itemValue: number) => setSelectedEmployee(itemValue)}
            >
              {employees.map(emp => (
                <Picker.Item key={emp.id} label={`${emp.firstName} ${emp.lastName} (ID: ${emp.id})`} value={emp.id} />
              ))}
            </Picker>
          </View>
        </View>
        {selectedEmployee && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Documents</Text>
              {renderUploadControls('offerLetterDoc', '📄 Upload Offer Letter:')}
              {renderUploadControls('latestPaySlipDoc', '📄 Upload Latest Payslip:')}
              {renderUploadControls('doc', '📄 Upload Additional Document:')}
              {companyDocs.map(doc => renderDocCard(doc, true))}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Documents</Text>
              {renderUploadControls('personalDoc', '📄 Upload Personal Document:')}
              {personalDocs.map(doc => renderDocCard(doc, false))}
            </View>
          </>
        )}
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  employeeSelector: {
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  uploadControls: {
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  fileName: {
    fontStyle: 'italic',
    marginBottom: 10,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF'
  },
  documentIcon: {
    marginRight: 15,
  },
  documentInfo: {
    flex: 1,
  },
  docName: {
    fontWeight: 'bold'
  },
  documentActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
    backgroundColor: '#5bc0de',
    padding: 8,
    borderRadius: 5,
  },
});

export default AdminDocumentsPage; 