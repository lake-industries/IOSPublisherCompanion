import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { useProjects } from '../context/ProjectContext';
import { NavigationProps } from '../types';

const CodeEditorScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { projects, updateProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
      setCode(projects[0].code);
    }
  }, [projects, selectedProjectId]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProjectId(projectId);
      setCode(project.code);
    }
  };

  const handleSaveCode = async () => {
    if (!selectedProjectId) {
      Alert.alert('Error', 'No project selected');
      return;
    }

    try {
      await updateProject(selectedProjectId, { code });
      Alert.alert('Success', 'Code saved successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save code';
      Alert.alert('Error', errorMsg);
    }
  };

  if (projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No projects available</Text>
        <Text style={styles.emptySubtext}>Create a project in the Projects tab to start coding</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Code Editor</Text>
      </View>

      <View style={styles.projectSelector}>
        <Text style={styles.selectorLabel}>Project:</Text>
        <View style={styles.projectOptions}>
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              style={[
                styles.projectOption,
                selectedProjectId === project.id && styles.projectOptionActive,
              ]}
              onPress={() => handleProjectChange(project.id)}
            >
              <Text
                style={[
                  styles.projectOptionText,
                  selectedProjectId === project.id && styles.projectOptionTextActive,
                ]}
              >
                {project.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.editor}
        multiline
        value={code}
        onChangeText={setCode}
        placeholder="Write your Swift code here..."
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveCode}>
        <Text style={styles.saveButtonText}>Save Code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  projectSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  projectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  projectOption: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  projectOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  projectOptionText: {
    fontSize: 12,
    color: '#000',
  },
  projectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  editor: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Courier New',
    color: '#000',
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CodeEditorScreen;
