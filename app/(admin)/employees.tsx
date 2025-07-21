import { useAuth } from '@/components/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Employee } from './employeeService';


const API_URL = 'http://192.168.1.26:8080/api';

const StatusBadge = ({ status, style }: { status?: string, style?: any }) => {
  const getColor = () => {
    switch (status?.toLowerCase()) {
      case 'active': return '#00C851';
      case 'pending': return '#ffbb33';
      case 'approved': return '#00C851';
      case 'rejected': return '#ff4444';
      default: return '#999';
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getColor() }, style]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
};

const departmentOptions = [
  'IT Services',
  'Product Development',
  'Quality Assurance',
  'DevOps & Infrastructure',
  'Database Management',
  'Business Analysis',
  'Human Resources',
  'Sales & Marketing',
  'Customer Support',
];
const statusOptions = ['Active', 'Pending', 'Approved', 'Rejected'];

const defaultNewEmployee = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: departmentOptions[0],
  jobTitle: '',
  hireDate: new Date(),
  salary: '',
  status: statusOptions[0],
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
  username: '', // NEW FIELD
  password: '', // NEW FIELD
};

const EmployeeScreen = () => {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [originalEmployees, setOriginalEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ ...defaultNewEmployee });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);


  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const employeesRes = await fetch(`${API_URL}/employee`);
      const employeesData = await employeesRes.json();

      const mappedEmployees = employeesData.map((emp: any) => ({
        id: emp.id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        department: emp.department || '',
        jobTitle: emp.jobTitle || '',
        hireDate: emp.hireDate || '',
        salary: emp.salary || 0,
        status: emp.status || 'Active',
        address: emp.address || {},
      }));
      setEmployees(mappedEmployees);
      setOriginalEmployees(mappedEmployees);

    } catch (error: any) {
      console.error('Error fetching employees:', error);
      if (error.response?.status === 401) {
        logout();
        router.replace('/login');
      }
      setError('Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        fetchEmployees();
    }
  }, [isAuthenticated]);

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    if (!text) {
      setEmployees(originalEmployees);
      return;
    }

    const filtered = originalEmployees.filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(text.toLowerCase()) ||
      emp.email.toLowerCase().includes(text.toLowerCase())
    );
    setEmployees(filtered);
  };

  const handleDepartmentFilter = (department: string) => {
    setSelectedDepartment(department);
    if (!department) {
      setEmployees(originalEmployees);
      return;
    }

    const filtered = originalEmployees.filter(emp =>
      emp.department.toLowerCase() === department.toLowerCase()
    );
    setEmployees(filtered);
  };

  const handleAddEmployee = async () => {
    // Basic validation
    if (!newEmployee.firstName.trim() || !newEmployee.lastName.trim() || !newEmployee.email.trim() || !newEmployee.phone.trim() || !newEmployee.jobTitle.trim() || !newEmployee.salary || !newEmployee.address.street.trim() || !newEmployee.address.city.trim() || !newEmployee.address.state.trim() || !newEmployee.address.postalCode.trim() || !newEmployee.address.country.trim()) {
      Toast.show({ type: 'error', text1: 'All fields are required!' });
      return;
    }
    // Auto-generate username if empty
    let username = newEmployee.username.trim();
    if (!username) {
      username = `${newEmployee.firstName}.${newEmployee.lastName}`.replace(/\s+/g, '').toLowerCase();
    }
    // Set default password if empty
    let password = newEmployee.password;
    if (!password) {
      password = 'welcome123';
    }
    try {
      const res = await fetch(`${API_URL}/employee/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEmployee,
          username,
          password,
          hireDate: newEmployee.hireDate.toISOString().slice(0, 10) + 'T09:00:00',
          salary: parseFloat(newEmployee.salary),
          address: {
            street: newEmployee.address.street,
            city: newEmployee.address.city,
            state: newEmployee.address.state,
            postalCode: newEmployee.address.postalCode,
            country: newEmployee.address.country,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to add employee');
      // Register employee for authentication
      try {
        const authRes = await fetch('http://192.168.1.26:8080/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: newEmployee.email,
            password: password,
            email: newEmployee.email,
            role: 'EMPLOYEE'
          })
        });
        if (!authRes.ok) throw new Error('Failed to register employee for login');
        Toast.show({ type: 'success', text1: 'Employee added and registered!' });
      } catch (authErr) {
        Toast.show({ type: 'error', text1: 'Employee added, but registration failed' });
      }
      setShowAddModal(false);
      setNewEmployee({ ...defaultNewEmployee });
      fetchEmployees();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to add employee' });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditEmployee({ ...employee, password: '', username: employee.username || '' });
    setEditModalVisible(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployee) return;
    // Remove strict validation for editing; allow partial update
    // Auto-generate username if empty
    let username = editEmployee.username?.trim() || '';
    if (!username) {
      username = `${editEmployee.firstName}.${editEmployee.lastName}`.replace(/\s+/g, '').toLowerCase();
    }
    // Set default password if empty
    let password = editEmployee.password || '';
    if (!password) {
      password = 'welcome123';
    }
    try {
      const res = await fetch(`${API_URL}/employee/${editEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editEmployee,
          username,
          password,
          hireDate: new Date(editEmployee.hireDate || new Date()).toISOString().slice(0, 10) + 'T09:00:00',
          salary: typeof editEmployee.salary === 'string' ? parseFloat(editEmployee.salary) : editEmployee.salary,
          address: {
            street: editEmployee.address?.street || '',
            city: editEmployee.address?.city || '',
            state: editEmployee.address?.state || '',
            postalCode: editEmployee.address?.postalCode || '',
            country: editEmployee.address?.country || '',
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to update employee');
      Toast.show({ type: 'success', text1: 'Employee updated!' });
      setEditModalVisible(false);
      setEditEmployee(null);
      fetchEmployees();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update employee' });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(salary);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchEmployees();
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Employee Management</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.filters}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchTerm}
              onChangeText={handleSearch}
            />
            <View style={styles.departmentFilter}>
              <Text style={styles.filterLabel}>Department:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['All', 'Engineering', 'Marketing', 'HR', 'Finance'].map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.filterChip,
                      selectedDepartment === (dept === 'All' ? '' : dept) && styles.filterChipSelected
                    ]}
                    onPress={() => handleDepartmentFilter(dept === 'All' ? '' : dept)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedDepartment === (dept === 'All' ? '' : dept) && styles.filterChipTextSelected
                    ]}>{dept}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {employees.map(emp => (
            <View key={emp.id} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <View>
                  <Text style={styles.employeeName}>
                    {emp.firstName} {emp.lastName}
                  </Text>
                  <Text style={styles.employeeEmail}>{emp.email}</Text>
                </View>
                <StatusBadge status={emp.status} />
              </View>
              <View style={styles.employeeDetails}>
                <Text style={styles.detailText}>Department: {emp.department}</Text>
                <Text style={styles.detailText}>Position: {emp.jobTitle}</Text>
                <Text style={styles.detailText}>
                  Hire Date: {formatDate(emp.hireDate as string)}
                </Text>
                <Text style={styles.detailText}>
                  Salary: {formatSalary(emp.salary as number)}
                </Text>
                <Text style={styles.detailText}>
                  Address: {emp.address?.street}, {emp.address?.city}, {emp.address?.state}, {emp.address?.postalCode}, {emp.address?.country}
                </Text>
                {/* Edit Button */}
                <TouchableOpacity style={[styles.modalButton, { marginTop: 8, backgroundColor: '#FFA500' }]} onPress={() => handleEditEmployee(emp)}>
                  <Text style={styles.modalButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* Add Employee FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      {/* Add Employee Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>Add Employee</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={newEmployee.firstName}
              onChangeText={text => setNewEmployee(e => ({ ...e, firstName: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={newEmployee.lastName}
              onChangeText={text => setNewEmployee(e => ({ ...e, lastName: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newEmployee.email}
              onChangeText={text => setNewEmployee(e => ({ ...e, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={newEmployee.phone}
              onChangeText={text => setNewEmployee(e => ({ ...e, phone: text }))}
              keyboardType="phone-pad"
            />
            {/* Address fields */}
            <TextInput
              style={styles.input}
              placeholder="Street"
              value={newEmployee.address.street}
              onChangeText={text => setNewEmployee(e => ({ ...e, address: { ...e.address, street: text } }))}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              value={newEmployee.address.city}
              onChangeText={text => setNewEmployee(e => ({ ...e, address: { ...e.address, city: text } }))}
            />
            <TextInput
              style={styles.input}
              placeholder="State"
              value={newEmployee.address.state}
              onChangeText={text => setNewEmployee(e => ({ ...e, address: { ...e.address, state: text } }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Postal Code"
              value={newEmployee.address.postalCode}
              onChangeText={text => setNewEmployee(e => ({ ...e, address: { ...e.address, postalCode: text } }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Country"
              value={newEmployee.address.country}
              onChangeText={text => setNewEmployee(e => ({ ...e, address: { ...e.address, country: text } }))}
            />
            <Picker
              selectedValue={newEmployee.department}
              style={styles.input}
              onValueChange={itemValue => setNewEmployee(e => ({ ...e, department: itemValue }))}
            >
              {departmentOptions.map(dept => (
                <Picker.Item key={dept} label={dept} value={dept} />
              ))}
            </Picker>
            <TextInput
              style={styles.input}
              placeholder="Job Title"
              value={newEmployee.jobTitle}
              onChangeText={text => setNewEmployee(e => ({ ...e, jobTitle: text }))}
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: '#333' }}>
                {newEmployee.hireDate ? newEmployee.hireDate.toLocaleDateString() : 'Select Hire Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={newEmployee.hireDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setNewEmployee(e => ({ ...e, hireDate: date }));
                }}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Salary"
              value={newEmployee.salary.toString()}
              onChangeText={text => setNewEmployee(e => ({ ...e, salary: text.replace(/[^0-9.]/g, '') }))}
              keyboardType="numeric"
            />
            <Picker
              selectedValue={newEmployee.status}
              style={styles.input}
              onValueChange={itemValue => setNewEmployee(e => ({ ...e, status: itemValue }))}
            >
              {statusOptions.map(status => (
                <Picker.Item key={status} label={status} value={status} />
              ))}
            </Picker>
            {/* Username Field */}
            <TextInput
              style={styles.input}
              placeholder="Auto-generated from name if empty"
              value={newEmployee.username}
              onChangeText={text => setNewEmployee(e => ({ ...e, username: text }))}
              autoCapitalize="none"
            />
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 8, marginLeft: 4 }}>Leave empty to auto-generate from name</Text>
            {/* Password Field */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Default: welcome123"
                value={newEmployee.password}
                onChangeText={text => setNewEmployee(e => ({ ...e, password: text }))}
                secureTextEntry={!showAddPassword}
              />
              <TouchableOpacity onPress={() => setShowAddPassword(!showAddPassword)} style={styles.eyeIcon}>
                <Ionicons name={showAddPassword ? 'eye-off' : 'eye'} size={24} color="grey" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 8, marginLeft: 4 }}>Leave empty for default password</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={styles.modalButton} onPress={handleAddEmployee}>
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      )}
      {/* Edit Employee Modal */}
      {editModalVisible && editEmployee && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>Edit Employee</Text>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={editEmployee.firstName}
                onChangeText={text => setEditEmployee(e => e ? { ...e, firstName: text } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={editEmployee.lastName}
                onChangeText={text => setEditEmployee(e => e ? { ...e, lastName: text } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editEmployee.email}
                onChangeText={text => setEditEmployee(e => e ? { ...e, email: text } : e)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={editEmployee.phone || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, phone: text } : e)}
                keyboardType="phone-pad"
              />
              {/* Address fields */}
              <TextInput
                style={styles.input}
                placeholder="Street"
                value={editEmployee.address?.street || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, address: { ...e.address, street: text } } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={editEmployee.address?.city || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, address: { ...e.address, city: text } } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="State"
                value={editEmployee.address?.state || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, address: { ...e.address, state: text } } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="Postal Code"
                value={editEmployee.address?.postalCode || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, address: { ...e.address, postalCode: text } } : e)}
              />
              <TextInput
                style={styles.input}
                placeholder="Country"
                value={editEmployee.address?.country || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, address: { ...e.address, country: text } } : e)}
              />
              <Picker
                selectedValue={editEmployee.department}
                style={styles.input}
                onValueChange={itemValue => setEditEmployee(e => e ? { ...e, department: itemValue } : e)}
              >
                {departmentOptions.map(dept => (
                  <Picker.Item key={dept} label={dept} value={dept} />
                ))}
              </Picker>
              <TextInput
                style={styles.input}
                placeholder="Job Title"
                value={editEmployee.jobTitle}
                onChangeText={text => setEditEmployee(e => e ? { ...e, jobTitle: text } : e)}
              />
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: '#333' }}>
                  {editEmployee.hireDate ? new Date(editEmployee.hireDate).toLocaleDateString() : 'Select Hire Date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(editEmployee.hireDate || new Date())}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setEditEmployee(e => e ? { ...e, hireDate: date.toISOString() } : e);
                    }
                  }}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Salary"
                value={editEmployee.salary !== undefined && editEmployee.salary !== null ? String(editEmployee.salary) : ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, salary: text === '' ? undefined : Number(text.replace(/[^0-9.]/g, '')) } : e)}
                keyboardType="numeric"
              />
              <Picker
                selectedValue={editEmployee.status}
                style={styles.input}
                onValueChange={itemValue => setEditEmployee(e => e ? { ...e, status: itemValue } : e)}
              >
                {statusOptions.map(status => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
              {/* Username Field */}
              <TextInput
                style={styles.input}
                placeholder="Auto-generated from name if empty"
                value={editEmployee.username || ''}
                onChangeText={text => setEditEmployee(e => e ? { ...e, username: text } : e)}
                autoCapitalize="none"
              />
              <Text style={{ fontSize: 12, color: '#888', marginBottom: 8, marginLeft: 4 }}>Leave empty to auto-generate from name</Text>
              {/* Password Field */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Default: welcome123"
                  value={editEmployee.password || ''}
                  onChangeText={text => setEditEmployee(e => e ? { ...e, password: text } : e)}
                  secureTextEntry={!showEditPassword}
                />
                <TouchableOpacity onPress={() => setShowEditPassword(!showEditPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showEditPassword ? 'eye-off' : 'eye'} size={24} color="grey" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: '#888', marginBottom: 8, marginLeft: 4 }}>Leave empty for default password</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity style={styles.modalButton} onPress={handleUpdateEmployee}>
                  <Text style={styles.modalButtonText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => { setEditModalVisible(false); setEditEmployee(null); }}>
                  <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f2f6ff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      color: '#666',
    },
    header: {
      padding: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e1e1e1',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    errorContainer: {
      margin: 16,
      padding: 12,
      backgroundColor: '#ffebee',
      borderRadius: 8,
    },
    errorText: {
      color: '#c62828',
    },
    section: {
      margin: 16,
      padding: 16,
      backgroundColor: '#fff',
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    filters: {
      marginBottom: 16,
    },
    searchInput: {
      backgroundColor: '#f5f5f5',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    departmentFilter: {
      marginTop: 8,
    },
    filterLabel: {
      fontSize: 14,
      color: '#666',
      marginBottom: 8,
    },
    filterChip: {
      backgroundColor: '#f5f5f5',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    },
    filterChipSelected: {
      backgroundColor: '#007AFF',
    },
    filterChipText: {
      color: '#666',
    },
    filterChipTextSelected: {
      color: '#fff',
    },
    employeeCard: {
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e1e1e1',
    },
    employeeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
    },
    employeeEmail: {
      fontSize: 14,
      color: '#666',
    },
    employeeDetails: {
      borderTopWidth: 1,
      borderTopColor: '#e1e1e1',
      paddingTop: 12,
    },
    detailText: {
      fontSize: 14,
      color: '#666',
      marginBottom: 4,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      backgroundColor: '#007AFF',
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    fabText: {
      color: '#fff',
      fontSize: 32,
      fontWeight: 'bold',
      marginTop: -2,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    modalContent: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 20,
      elevation: 6,
    },
    modalScrollContent: {
      paddingBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#1a1a1a',
      textAlign: 'center',
    },
    input: {
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      fontSize: 16,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      marginBottom: 10,
    },
    passwordInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
    },
    eyeIcon: {
      padding: 12,
    },
    modalButton: {
      flex: 1,
      backgroundColor: '#007AFF',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    modalButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

export default EmployeeScreen; 