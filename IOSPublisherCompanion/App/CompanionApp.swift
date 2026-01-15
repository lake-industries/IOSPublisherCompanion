import SwiftUI

@main
struct IOSAppPublisherCompanion: App {
    @StateObject private var projectsViewModel = ProjectsViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(projectsViewModel)
        }
    }
}

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Projects Tab
            ProjectsView()
                .tabItem {
                    Label("Projects", systemImage: "folder.fill")
                }
                .tag(0)
            
            // Code Editor Tab
            CodeEditorView()
                .tabItem {
                    Label("Editor", systemImage: "code")
                }
                .tag(1)
            
            // Preview Tab
            PreviewView()
                .tabItem {
                    Label("Preview", systemImage: "eye.fill")
                }
                .tag(2)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(ProjectsViewModel())
}