import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import ProjectsScreen from './screens/ProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import CodeEditorScreen from './screens/CodeEditorScreen';
import PreviewScreen from './screens/PreviewScreen';
import SimulatorScreen from './screens/SimulatorScreen';
import { ProjectProvider } from './context/ProjectContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ProjectsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ title: 'Project Details' }}
      />
    </Stack.Navigator>
  );
};

const CodeEditorStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CodeEditorMain"
        component={CodeEditorScreen}
        options={{ title: 'Code Editor' }}
      />
    </Stack.Navigator>
  );
};

const PreviewStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PreviewMain"
        component={PreviewScreen}
        options={{ title: 'Preview' }}
      />
    </Stack.Navigator>
  );
};

const SimulatorStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SimulatorMain"
        component={SimulatorScreen}
        options={{ title: 'App Simulator' }}
      />
    </Stack.Navigator>
  );
};

const RootNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabel: route.name === 'ProjectsTab' ? 'Projects' : route.name === 'CodeEditorTab' ? 'Code' : route.name === 'PreviewTab' ? 'Preview' : 'Simulator',
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          paddingBottom: 5,
          height: 50,
        },
      })}
    >
      <Tab.Screen name="ProjectsTab" component={ProjectsStack} />
      <Tab.Screen name="CodeEditorTab" component={CodeEditorStack} />
      <Tab.Screen name="PreviewTab" component={PreviewStack} />
      <Tab.Screen name="SimulatorTab" component={SimulatorStack} />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <ProjectProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ProjectProvider>
  );
};

export default App;
