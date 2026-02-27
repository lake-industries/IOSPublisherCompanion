import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useProjects } from '../context/ProjectContext';
import { NavigationProps } from '../types';

const PreviewScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No projects available</Text>
        <Text style={styles.emptySubtext}>Create a project in the Projects tab to see previews</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Preview</Text>
      </View>

      <View style={styles.projectSelector}>
        <Text style={styles.selectorLabel}>Select Project:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              style={[
                styles.projectButton,
                selectedProjectId === project.id && styles.projectButtonActive,
              ]}
              onPress={() => setSelectedProjectId(project.id)}
            >
              <Text
                style={[
                  styles.projectButtonText,
                  selectedProjectId === project.id && styles.projectButtonTextActive,
                ]}
              >
                {project.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedProject && (
        <ScrollView style={styles.content}>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Project Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedProject.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bundle ID:</Text>
              <Text style={styles.detailValue}>{selectedProject.bundleId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Team ID:</Text>
              <Text style={styles.detailValue}>{selectedProject.teamId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Version:</Text>
              <Text style={styles.detailValue}>{selectedProject.version}</Text>
            </View>
          </View>

          {selectedProject.code && (
            <View style={styles.codeCard}>
              <Text style={styles.sectionTitle}>Code Preview</Text>
              <View style={styles.codeContainer}>
                <Text style={styles.code} numberOfLines={20}>
                  {selectedProject.code}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedProject.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Updated:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedProject.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  projectButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  projectButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  projectButtonText: {
    fontSize: 12,
    color: '#000',
  },
  projectButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  codeContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
    maxHeight: 300,
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: '#000',
    lineHeight: 18,
  },
});

export default PreviewScreen;
