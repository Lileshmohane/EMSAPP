import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView, StyleSheet,
  Text,
  View
} from 'react-native';

const API_URL = 'http://192.168.1.12:8080/api';

// Type definitions
interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  assignedTo: string;
  dueDate: string;
}

const StatusBadge = ({ status, style }: { status?: string, style?: any}) => {
    const getColor = () => {
      switch (status?.toLowerCase()) {
        case 'active': return '#00C851';
        case 'pending': return '#ffbb33';
        case 'approved': return '#00C851';
        case 'rejected': return '#ff4444';
        case 'completed': return '#00C851';
        default: return '#999';
      }
    };
  
    return (
      <View style={[styles.statusBadge, { backgroundColor: getColor() }, style]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  };

const AdminDashboard = () => {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ employees: 0, leaveRequests: 0, activeTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [employeesRes, leavesRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/employee`),
        fetch(`${API_URL}/leaves/`),
        fetch(`${API_URL}/tasks`)
      ]);

      const [employeesData, leavesData, tasksData] = await Promise.all([
        employeesRes.json(),
        leavesRes.json(),
        tasksRes.json()
      ]);

      setStats({
          employees: employeesData.length || 0,
          leaveRequests: leavesData.length || 0,
          activeTasks: tasksData.filter((t: Task) => !t.completed).length || 0,
      });

      setLeaveRequests(leavesData.map((leave: any) => ({
        id: leave.id,
        leaveType: leave.leaveType || 'Not Specified',
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason || 'No reason provided',
        status: (leave.status || 'PENDING').toUpperCase(),
        employee: {
          id: leave.employee?.id || '',
          name: `${leave.employee?.firstName || 'Unknown'} ${leave.employee?.lastName || ''}`,
          email: leave.employee?.email || 'No email'
        }
      })));

      setTasks(tasksData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
        router.replace('/login');
      }
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    if(!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
            fetchDashboardData();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Employees</Text>
          <Text style={styles.statValue}>{stats.employees}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Leave Requests</Text>
          <Text style={styles.statValue}>{stats.leaveRequests}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Tasks</Text>
          <Text style={styles.statValue}>{stats.activeTasks}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Leave Requests</Text>
        {leaveRequests.slice(0, 5).map(request => (
          <View key={request.id} style={styles.leaveCard}>
            <View style={styles.leaveHeader}>
              <View>
                <Text style={styles.employeeName}>{request.employee.name}</Text>
                <Text style={styles.employeeEmail}>{request.employee.email}</Text>
              </View>
              <StatusBadge status={request.status} />
            </View>
            <View style={styles.leaveDetails}>
              <Text style={styles.detailText}>Type: {request.leaveType}</Text>
              <Text style={styles.detailText}>
                Duration: {formatDate(request.startDate)} - {formatDate(request.endDate)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        {tasks.slice(0, 5).map(task => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge 
                status={task.completed ? 'Completed' : 'Pending'}
                style={task.completed ? styles.completedStatus : styles.pendingStatus}
              />
            </View>
            <View style={styles.taskFooter}>
              <Text style={styles.assignedTo}>Assigned to: {task.assignedTo}</Text>
              <Text style={styles.dueDate}>Due: {formatDate(task.dueDate)}</Text>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-around',
  },
  statCard: {
    minWidth: '30%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    margin: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
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
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  leaveHeader: {
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
  leaveDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingTop: 12,
  },
  assignedTo: {
    fontSize: 12,
    color: '#666',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
  },
  completedStatus: {
    backgroundColor: '#00C851',
  },
  pendingStatus: {
    backgroundColor: '#ffbb33',
  },
});

export default AdminDashboard; 