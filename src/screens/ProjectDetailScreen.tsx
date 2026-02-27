import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useProjects } from '../context/ProjectContext';
import { NavigationProps } from '../types';

interface ProjectDetailScreenProps extends NavigationProps {
  route?: {
    params?: {
      projectId?: string;
    };
  };
}

const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({ navigation, route }) => {
  const { getProjectById, addProject, updateProject } = useProjects();
  const projectId = route?.params?.projectId;

  const [name, setName] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (projectId) {
      const project = getProjectById(projectId);
      if (project) {
        setName(project.name);
        setBundleId(project.bundleId);
        setTeamId(project.teamId);
        setVersion(project.version);
        setIsEditing(true);
      }
    }
  }, [projectId, getProjectById]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a project name');
      return false;
    }
    if (!bundleId.trim()) {
      Alert.alert('Validation Error', 'Please enter a bundle ID');
      return false;
    }
    if (!teamId.trim()) {
      Alert.alert('Validation Error', 'Please enter a team ID');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (isEditing && projectId) {
        await updateProject(projectId, {
          name,
          bundleId,
          teamId,
          version,
        });
        Alert.alert('Success', 'Project updated successfully');
      } else {
        await addProject({
          name,
          bundleId,
          teamId,
          version,
          code: '',
        });
        Alert.alert('Success', 'Project created successfully');
        setName('');
        setBundleId('');
        setTeamId('');
        setVersion('1.0.0');
      }

      navigation.goBack();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter project name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bundle ID</Text>
          <TextInput
            style={styles.input}
            placeholder="com.example.app"
            value={bundleId}
            onChangeText={setBundleId}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Team ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter team ID"
            value={teamId}
            onChangeText={setTeamId}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Version</Text>
          <TextInput
            style={styles.input}
            placeholder="1.0.0"
            value={version}
            onChangeText={setVersion}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Project' : 'Create Project'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectDetailScreen;
