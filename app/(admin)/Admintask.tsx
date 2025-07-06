import { AntDesign, Entypo } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance from '../../utils/axiosInstance';

// Type definitions
interface Task {
  id: number;
  title: string;
  description: string;
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  assignedTo: string;
  team: string;
  projectId: number;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Project {
  id: number;
  name: string;
  description: string;
  companyId: number;
  tasks: Task[];
}

interface Company {
  id: number;
  name: string;
  description: string;
  projects: Project[];
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}

const formatDateForAPI = (dateString: string | Date): string | null => {
  if (!dateString) return null;
  if (dateString instanceof Date) {
    return dateString.toISOString();
  }
  // Assuming dateString is in 'YYYY-MM-DD' format
  return `${dateString}T10:00:00`;
};

const Admintask = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState("companies"); // 'companies', 'projects', 'tasks'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // State for new item modals
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const [newCompany, setNewCompany] = useState({ name: "", description: "" });
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    companyId: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    status: "NOT_STARTED" as "NOT_STARTED",
    dueDate: "",
    priority: "MEDIUM" as "MEDIUM",
    projectId: "",
    team: "",
  });

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>({
    title: "",
    description: "",
    assignedTo: "",
    status: "NOT_STARTED",
    dueDate: "",
    priority: "MEDIUM",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<
    "newTask" | "editTask" | null
  >(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError(null);
      const companiesResponse = await axiosInstance.get("/companies");
      const employeesResponse = await axiosInstance.get("/employee");

      if (isMounted) {
        setCompanies(companiesResponse.data);
        setEmployees(employeesResponse.data);
      }
    } catch (err: any) {
      console.error("Error initializing data:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to load data. Please try again later.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  };

  const createCompany = async (companyData: {
    name: string;
    description: string;
  }) => {
    try {
      const response = await axiosInstance.post("/companies", companyData);
      setCompanies((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError("Failed to create company");
      throw err;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await axiosInstance.delete(`/tasks/${id}`);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.filter((task) => task.id !== id),
              }
            : null
        );
      }
    } catch (err: any) {
      setError("Failed to delete task");
      throw err;
    }
  };

  const handleCompanyClick = async (company: Company) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/companies/${company.id}`);
      setSelectedCompany(response.data);
      setView("projects");
    } catch (err: any) {
      console.error("Error fetching company:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to fetch company details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/projects/${project.id}`);
      setSelectedProject(response.data);
      setView("tasks");
    } catch (err: any) {
      console.error("Error fetching project:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to fetch project details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === "tasks") {
      setView("projects");
      setSelectedProject(null);
    } else if (view === "projects") {
      setView("companies");
      setSelectedCompany(null);
    }
  };

  const handleNewCompanySubmit = async () => {
    if (!newCompany.name.trim()) {
      Alert.alert("Error", "Company name is required");
      return;
    }
    try {
      setLoading(true);
      await createCompany(newCompany);
      setShowNewCompanyModal(false);
      setNewCompany({ name: "", description: "" });
    } catch (err) {
      setError("Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProjectSubmit = async () => {
    if (!newProject.name.trim() || !selectedCompany) {
      Alert.alert("Error", "Project name and a selected company are required");
      return;
    }
    try {
      setLoading(true);
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        company: { id: selectedCompany.id },
      };
      const response = await axiosInstance.post("/projects", projectData);
      setSelectedCompany((prev) =>
        prev
          ? {
              ...prev,
              projects: [...prev.projects, response.data],
            }
          : null
      );
      setShowNewProjectModal(false);
      setNewProject({ name: "", description: "", companyId: "" });
    } catch (err: any) {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate =
      selectedDate ||
      (datePickerFor === "newTask"
        ? new Date(newTask.dueDate)
        : new Date(formData.dueDate));
    setShowDatePicker(Platform.OS === "ios");
    if (datePickerFor === "newTask") {
      setNewTask({ ...newTask, dueDate: currentDate.toISOString().split("T")[0] });
    } else if (datePickerFor === "editTask") {
      setFormData({
        ...formData,
        dueDate: currentDate.toISOString().split("T")[0],
      });
    }
  };

  const createTask = async (taskData: any) => {
    try {
      const formattedData = {
        ...taskData,
        dueDate: formatDateForAPI(taskData.dueDate),
        project: { id: selectedProject!.id },
      };
      const response = await axiosInstance.post("/tasks", formattedData);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: [...prev.tasks, response.data],
              }
            : null
        );
      }
      return response.data;
    } catch (err: any) {
      console.error(
        "API Error:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to create task. " + (err.response?.data?.message || ""));
      throw err;
    }
  };

  const updateTask = async (id: number, taskData: any) => {
    try {
      const formattedData = {
        ...taskData,
        dueDate: formatDateForAPI(taskData.dueDate),
      };
      const response = await axiosInstance.put(`/tasks/${id}`, formattedData);
      if (selectedProject) {
        setSelectedProject((prev) => {
          if (!prev) return null;
          const updatedTasks = prev.tasks.map((task) =>
            task.id === id ? { ...task, ...response.data } : task
          );
          return { ...prev, tasks: updatedTasks };
        });
      }
      return response.data;
    } catch (err: any) {
      console.error(
        "API Error:",
        err.response ? err.response.data : err.message
      );
      setError(
        "Failed to update task. " + (err.response?.data?.message || "")
      );
      throw err;
    }
  };

  const markTaskAsCompleted = async (id: number) => {
    try {
      await axiosInstance.put(`/tasks/${id}/complete`);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === id ? { ...t, status: "COMPLETED" } : t
                ),
              }
            : null
        );
      }
    } catch (err) {
      setError("Failed to mark task as completed");
    }
  };

  const handleEditTask = async (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.employee?.id.toString() || "",
      status: task.status,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      priority: task.priority,
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(taskId);
          } catch (err) {
            Alert.alert("Error", "Failed to delete task.");
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!editingTask) return;
    try {
      setLoading(true);
      await updateTask(editingTask.id, {
        ...formData,
        assignedTo: parseInt(formData.assignedTo),
      });
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      // Error is handled in updateTask
    } finally {
      setLoading(false);
    }
  };

  const handleNewTaskSubmit = async () => {
    if (!newTask.title.trim() || !selectedProject) return;
    try {
      setLoading(true);
      await createTask({
        ...newTask,
        projectId: selectedProject.id,
        assignedTo: parseInt(newTask.assignedTo, 10),
      });
      setShowNewTaskModal(false);
      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        status: "NOT_STARTED",
        dueDate: "",
        priority: "MEDIUM",
        projectId: "",
        team: "",
      });
    } catch (err) {
      // Error is handled in createTask
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "checkcircle";
      case "IN_PROGRESS":
        return "clockcircle";
      case "NOT_STARTED":
        return "minuscircle";
      default:
        return "questioncircle";
    }
  };

  const formatStatus = (status: Task["status"]) =>
    status
      .replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const showDatepickerFor = (field: "newTask" | "editTask") => {
    setDatePickerFor(field);
    setShowDatePicker(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {view !== "companies" && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>
        {view === "companies"
          ? "Companies"
          : view === "projects"
          ? selectedCompany?.name
          : selectedProject?.name}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderCompanies = () => (
    <ScrollView>
      {companies.map((company) => (
        <TouchableOpacity
          key={company.id}
          style={styles.listItem}
          onPress={() => handleCompanyClick(company)}
        >
          <Text style={styles.listItemText}>{company.name}</Text>
          <AntDesign name="right" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProjects = () => (
    <ScrollView>
      {selectedCompany?.projects.map((project) => (
        <TouchableOpacity
          key={project.id}
          style={styles.listItem}
          onPress={() => handleProjectClick(project)}
        >
          <Text style={styles.listItemText}>{project.name}</Text>
          <AntDesign name="right" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTasks = () => (
    <ScrollView>
      {selectedProject?.tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => handleEditTask(task)}>
                <AntDesign name="edit" size={20} color="#FFC107" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                <AntDesign
                  name="delete"
                  size={20}
                  color="#F44336"
                  style={{ marginLeft: 15 }}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.taskDescription}>{task.description}</Text>
          <View style={styles.taskMeta}>
            <View style={styles.taskStatus}>
              <AntDesign
                name={getStatusIcon(task.status)}
                size={16}
                color="#fff"
              />
              <Text style={styles.taskMetaText}>{formatStatus(task.status)}</Text>
            </View>
            <Text style={styles.taskMetaText}>
              Due:{" "}
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
          {task.employee && (
            <Text style={styles.taskMetaText}>
              Assigned to: {task.employee.firstName} {task.employee.lastName}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderModal = (
    title: string,
    visible: boolean,
    onRequestClose: () => void,
    children: React.ReactNode,
    onSubmit?: () => void
  ) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {children}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={onRequestClose}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
            {onSubmit && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSubmit]}
                onPress={onSubmit}
              >
                <Text style={styles.textStyle}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNewCompanyModal = () =>
    renderModal(
      "Add New Company",
      showNewCompanyModal,
      () => setShowNewCompanyModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          placeholderTextColor="#999"
          value={newCompany.name}
          onChangeText={(text) => setNewCompany({ ...newCompany, name: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={newCompany.description}
          onChangeText={(text) =>
            setNewCompany({ ...newCompany, description: text })
          }
        />
      </>,
      handleNewCompanySubmit
    );

  const renderNewProjectModal = () =>
    renderModal(
      "Add New Project",
      showNewProjectModal,
      () => setShowNewProjectModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Project Name"
          placeholderTextColor="#999"
          value={newProject.name}
          onChangeText={(text) => setNewProject({ ...newProject, name: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={newProject.description}
          onChangeText={(text) =>
            setNewProject({ ...newProject, description: text })
          }
        />
      </>,
      handleNewProjectSubmit
    );

  const renderNewTaskModal = () =>
    renderModal(
      "Add New Task",
      showNewTaskModal,
      () => setShowNewTaskModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#999"
          value={newTask.title}
          onChangeText={(text) => setNewTask({ ...newTask, title: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          placeholder="Description"
          placeholderTextColor="#999"
          value={newTask.description}
          onChangeText={(text) =>
            setNewTask({ ...newTask, description: text })
          }
        />
        <TouchableOpacity
          onPress={() => showDatepickerFor("newTask")}
          style={styles.input}
        >
          <Text style={{ color: newTask.dueDate ? "#fff" : "#999" }}>
            {newTask.dueDate || "Select Due Date"}
          </Text>
        </TouchableOpacity>
        <Picker
          selectedValue={newTask.assignedTo}
          style={styles.picker}
          onValueChange={(itemValue) =>
            setNewTask({ ...newTask, assignedTo: itemValue })
          }
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Assign to an employee" value="" />
          {employees.map((employee) => (
            <Picker.Item
              key={employee.id}
              label={`${employee.firstName} ${employee.lastName}`}
              value={employee.id.toString()}
            />
          ))}
        </Picker>
      </>,
      handleNewTaskSubmit
    );

  const renderEditTaskModal = () =>
    editingTask &&
    renderModal(
      "Edit Task",
      isModalOpen,
      () => setIsModalOpen(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          placeholder="Description"
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
        />
        <TouchableOpacity
          onPress={() => showDatepickerFor("editTask")}
          style={styles.input}
        >
          <Text style={{ color: formData.dueDate ? "#fff" : "#999" }}>
            {formData.dueDate || "Select Due Date"}
          </Text>
        </TouchableOpacity>
        <Picker
          selectedValue={formData.assignedTo}
          style={styles.picker}
          onValueChange={(itemValue) =>
            setFormData({ ...formData, assignedTo: itemValue })
          }
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Assign to an employee" value="" />
          {employees.map((employee) => (
            <Picker.Item
              key={employee.id}
              label={`${employee.firstName} ${employee.lastName}`}
              value={employee.id.toString()}
            />
          ))}
        </Picker>
      </>,
      handleSubmit
    );

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#00ff00"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  if (error)
    return (
      <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
        {error}
      </Text>
    );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <View style={styles.content}>
        {view === "companies" && renderCompanies()}
        {view === "projects" && renderProjects()}
        {view === "tasks" && renderTasks()}
      </View>

      {view === "companies" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewCompanyModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}
      {view === "projects" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewProjectModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}
      {view === "tasks" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewTaskModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            datePickerFor === "newTask"
              ? newTask.dueDate
                ? new Date(newTask.dueDate)
                : new Date()
              : formData.dueDate
              ? new Date(formData.dueDate)
              : new Date()
          }
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      {renderNewCompanyModal()}
      {renderNewProjectModal()}
      {renderNewTaskModal()}
      {renderEditTaskModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#1E1E1E",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  listItem: {
    backgroundColor: "#1E1E1E",
    padding: 20,
    marginVertical: 8,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemText: {
    color: "#fff",
    fontSize: 16,
  },
  taskCard: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  taskTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  taskActions: {
    flexDirection: "row",
  },
  taskDescription: {
    color: "#b0b0b0",
    marginBottom: 10,
  },
  taskMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  taskStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskMetaText: {
    color: "#999",
    marginLeft: 5,
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: "#03DAC6",
    borderRadius: 28,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 20,
    alignItems: "stretch",
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 15,
    minHeight: 40,
    justifyContent: "center",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    marginLeft: 10,
  },
  buttonClose: {
    backgroundColor: "#555",
  },
  buttonSubmit: {
    backgroundColor: "#03DAC6",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  picker: {
    backgroundColor: "#333",
    color: "#fff",
    marginBottom: 15,
  },
});

export default Admintask;