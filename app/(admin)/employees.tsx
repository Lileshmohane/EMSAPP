import { useAuth } from '@/components/AuthContext';
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
import { Employee } from './employeeService';


const API_URL = 'http://192.168.1.12:8080/api';

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
        status: emp.status || 'Active'
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
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
  });

export default EmployeeScreen; 