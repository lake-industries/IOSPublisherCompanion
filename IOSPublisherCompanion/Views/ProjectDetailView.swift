import SwiftUI

struct ProjectDetailView: View {
    @Binding var project: IOSProject
    @EnvironmentObject private var viewModel: ProjectsViewModel
    
    var body: some View {
        Form {
            Section("Project Information") {
                TextField("Project Name", text: $project.name)
                TextField("Bundle ID", text: $project.bundleId)
                TextField("Team ID", text: $project.teamId)
                TextField("Version", text: $project.version)
            }
            
            Section("Metadata") {
                HStack {
                    Text("Created")
                    Spacer()
                    Text(project.createdDate.formatted(date: .abbreviated, time: .shortened))
                        .foregroundColor(.gray)
                }
                HStack {
                    Text("Last Modified")
                    Spacer()
                    Text(project.lastModified.formatted(date: .abbreviated, time: .shortened))
                        .foregroundColor(.gray)
                }
            }
            
            Section("Code") {
                NavigationLink(destination: CodeEditorView(project: $project)) {
                    HStack {
                        Image(systemName: "code")
                        Text("Edit Code")
                        Spacer()
                        Text("\(project.code.count) chars")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") {
                    viewModel.updateProject(project)
                }
            }
        }
    }
}

#Preview {
    @State var project = IOSProject(
        id: UUID().uuidString,
        name: "My App",
        bundleId: "com.example.app",
        teamId: "ABC123"
    )
    
    return NavigationStack {
        ProjectDetailView(project: $project)
            .environmentObject(ProjectsViewModel())
    }
}