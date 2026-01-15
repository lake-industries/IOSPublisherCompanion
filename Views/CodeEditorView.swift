import SwiftUI

struct CodeEditorView: View {
    @Binding var project: IOSProject
    @EnvironmentObject private var viewModel: ProjectsViewModel
    @State private var showingSaveAlert = false
    @State private var savedMessage = ""
    
    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                Text(project.name)
                    .font(.headline)
                Spacer()
                Menu {
                    Button(action: insertSwiftUITemplate) {
                        Label("SwiftUI Template", systemImage: "doc.text")
                    }
                    Button(action: insertHelloWorld) {
                        Label("Hello World", systemImage: "helloworld")
                    }
                    Button(action: clearCode) {
                        Label("Clear", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .borderBottom()
            
            // Code Editor
            TextEditor(text: $project.code)
                .font(.system(.body, design: .monospaced))
                .lineSpacing(4)
                .padding()
            
            // Status Bar
            HStack {
                Text("\(project.code.split(separator: "\n").count) lines • \(project.code.count) chars")
                    .font(.caption)
                    .foregroundColor(.gray)
                Spacer()
                Text("Last saved: \(project.lastModified.formatted(time: .shortened))")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color(.systemGray6))
            .borderTop()
        }
        .navigationTitle("Code Editor")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    project.updateCode(project.code)
                    viewModel.updateProject(project)
                    showingSaveAlert = true
                }
            }
        }
        .alert("Saved!", isPresented: $showingSaveAlert) {
            Button("OK") { }
        } message: {
            Text("Your code has been saved successfully.")
        }
    }
    
    private func insertSwiftUITemplate() {
        let template = """
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("\(project.name)")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Version \(project.version)")
                .font(.subheadline)
                .foregroundColor(.gray)
            
            Spacer()
            
            Button(action: {}) {
                Text("Tap Me")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(8)
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
"""
        project.code = template
    }
    
    private func insertHelloWorld() {
        let helloWorld = """
import SwiftUI

struct ContentView: View {
    var body: some View {
        Text("Hello, World!")
            .font(.largeTitle)
            .fontWeight(.bold)
    }
}

#Preview {
    ContentView()
}
"""
        project.code = helloWorld
    }
    
    private func clearCode() {
        project.code = ""
    }
}

#Preview {
    @State var project = IOSProject(
        id: UUID().uuidString,
        name: "My App",
        bundleId: "com.example.app",
        teamId: "ABC123",
        code: "import SwiftUI\n\nstruct ContentView: View {\n    var body: some View {\n        Text(\"Hello, World!\")\n    }\n}"
    )
    
    return NavigationStack {
        CodeEditorView(project: $project)
            .environmentObject(ProjectsViewModel())
    }
}

// MARK: - View Extensions
extension View {
    func borderTop() -> some View {
        self.border(Color(.systemGray4), width: 1)
    }
    
    func borderBottom() -> some View {
        self.border(Color(.systemGray4), width: 1)
    }
}