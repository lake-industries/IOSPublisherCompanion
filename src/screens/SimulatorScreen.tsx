import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useProjects } from '../context/ProjectContext';

type SimulatorTab = 'projects' | 'code' | 'preview';

interface SessionState {
  id: string;
  selectedProjectId: string | null;
  activeTab: SimulatorTab;
}

const SimulatorScreen = () => {
  const [sessions, setSessions] = useState<SessionState[]>([
    { id: '1', selectedProjectId: null, activeTab: 'projects' },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('1');
  const { projects, deleteProject } = useProjects();

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const updateSession = (updates: Partial<SessionState>) => {
    setSessions(sessions.map(s =>
      s.id === activeSessionId ? { ...s, ...updates } : s
    ));
  };

  const addSession = () => {
    const newId = String(Math.max(...sessions.map(s => parseInt(s.id, 10))) + 1);
    setSessions([...sessions, { id: newId, selectedProjectId: null, activeTab: 'projects' }]);
    setActiveSessionId(newId);
  };

  const removeSession = (sessionId: string) => {
    if (sessions.length === 1) return;
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const renderProjectsList = () => (
    <View style={styles.simulatorContent}>
      <Text style={styles.simulatorTitle}>Projects</Text>
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptySubtext}>Create your first iOS project</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.projectCard}>
              <TouchableOpacity
                onPress={() => updateSession({ selectedProjectId: item.id })}
                style={styles.projectInfo}
              >
                <Text style={styles.projectName}>{item.name}</Text>
                <Text style={styles.projectMeta}>{item.bundleId}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteProject(item.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );

  const renderCodeEditor = () => (
    <View style={styles.simulatorContent}>
      <Text style={styles.simulatorTitle}>Code Editor</Text>
      {selectedProject ? (
        <View>
          <Text style={styles.projectName}>{selectedProject.name}</Text>
          <TextInput
            style={styles.codeInput}
            value={selectedProject.code}
            editable={false}
            multiline
            placeholder="No code yet"
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No project selected</Text>
          <Text style={styles.emptySubtext}>Select a project from Projects tab</Text>
        </View>
      )}
    </View>
  );

  const renderPreview = () => (
    <View style={styles.simulatorContent}>
      <Text style={styles.simulatorTitle}>Preview</Text>
      {selectedProject ? (
        <ScrollView>
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Project Name</Text>
            <Text style={styles.previewValue}>{selectedProject.name}</Text>

            <Text style={styles.previewLabel}>Bundle ID</Text>
            <Text style={styles.previewValue}>{selectedProject.bundleId}</Text>

            <Text style={styles.previewLabel}>Team ID</Text>
            <Text style={styles.previewValue}>{selectedProject.teamId}</Text>

            <Text style={styles.previewLabel}>Version</Text>
            <Text style={styles.previewValue}>{selectedProject.version}</Text>

            <Text style={styles.previewLabel}>Created</Text>
            <Text style={styles.previewValue}>
              {new Date(selectedProject.createdAt).toLocaleDateString()}
            </Text>

            <Text style={styles.previewLabel}>Last Updated</Text>
            <Text style={styles.previewValue}>
              {new Date(selectedProject.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No project selected</Text>
          <Text style={styles.emptySubtext}>Select a project to preview</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Session Tabs */}
      <View style={styles.sessionTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sessionTabs}>
            {sessions.map(session => (
              <TouchableOpacity
                key={session.id}
                onPress={() => setActiveSessionId(session.id)}
                style={[styles.sessionTab, activeSessionId === session.id && styles.activeSessionTab]}
              >
                <Text style={[styles.sessionTabText, activeSessionId === session.id && styles.activeSessionTabText]}>
                  Session {session.id}
                </Text>
                {sessions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeSession(session.id)}
                    style={styles.closeSessionBtn}
                  >
                    <Text style={styles.closeSessionBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={addSession} style={styles.addSessionBtn}>
              <Text style={styles.addSessionBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Simulator Frame */}
      <View style={styles.simulatorFrame}>
        {/* Simulator Header (Phone Status Bar) */}
        <View style={styles.simulatorHeader}>
          <Text style={styles.simulatorTime}>9:41</Text>
          <Text style={styles.simulatorSignal}>●●●●●</Text>
        </View>

        {/* Content Area */}
        <ScrollView style={styles.simulatorContentWrapper}>
          {currentSession.activeTab === 'projects' && renderProjectsList()}
          {currentSession.activeTab === 'code' && renderCodeEditor()}
          {currentSession.activeTab === 'preview' && renderPreview()}
        </ScrollView>

        {/* Simulator Tabs (Bottom) */}
        <View style={styles.simulatorTabs}>
          <TouchableOpacity
            style={[styles.simulatorTab, currentSession.activeTab === 'projects' && styles.activeTab]}
            onPress={() => updateSession({ activeTab: 'projects' })}
          >
            <Text style={[styles.tabText, currentSession.activeTab === 'projects' && styles.activeTabText]}>
              Projects
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.simulatorTab, currentSession.activeTab === 'code' && styles.activeTab]}
            onPress={() => updateSession({ activeTab: 'code' })}
          >
            <Text style={[styles.tabText, currentSession.activeTab === 'code' && styles.activeTabText]}>
              Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.simulatorTab, currentSession.activeTab === 'preview' && styles.activeTab]}
            onPress={() => updateSession({ activeTab: 'preview' })}
          >
            <Text style={[styles.tabText, currentSession.activeTab === 'preview' && styles.activeTabText]}>
              Preview
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Text */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>App Simulator</Text>
        <Text style={styles.infoText}>
          Test multiple projects in parallel. Each session has its own state. Tap "+ New" to add more sessions.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 8,
  },
  sessionTabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sessionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeSessionTab: {
    backgroundColor: '#007AFF',
    borderColor: '#0051D5',
  },
  sessionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeSessionTabText: {
    color: '#fff',
  },
  closeSessionBtn: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  closeSessionBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  addSessionBtn: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  addSessionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  simulatorFrame: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
    maxWidth: '100%',
    aspectRatio: 9 / 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  simulatorHeader: {
    backgroundColor: '#000',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simulatorTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  simulatorSignal: {
    color: '#fff',
    fontSize: 12,
  },
  simulatorContentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  simulatorContent: {
    padding: 12,
  },
  simulatorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
  },
  projectCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  projectMeta: {
    fontSize: 12,
    color: '#666',
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'Courier New',
    fontSize: 11,
    minHeight: 120,
    color: '#000',
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  simulatorTabs: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 50,
  },
  simulatorTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default SimulatorScreen;
