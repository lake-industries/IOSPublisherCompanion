import SwiftUI

struct NewProjectSheet: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var viewModel: ProjectsViewModel
    
    @State private var name = "New Project"
    @State private var bundleId = "com.example.app"
    @State private var teamId = ""
    @State private var version = "1.0.0"
    
    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !bundleId.trimmingCharacters(in: .whitespaces).isEmpty &&
        !teamId.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Project Details") {
                    TextField("Project Name", text: $name)
                    TextField("Bundle ID (com.company.app)", text: $bundleId)
                    TextField("Team ID", text: $teamId)
                    TextField("Version", text: $version)
                }
                
                Section {
                    Text("Bundle ID must be in reverse domain format (com.example.app)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        let project = IOSProject(
                            id: UUID().uuidString,
                            name: name,
                            bundleId: bundleId,
                            teamId: teamId,
                            version: version
                        )
                        viewModel.addProject(project)
                        dismiss()
                    }
                    .disabled(!isValid)
                }
            }
        }
    }
}

#Preview {
    NewProjectSheet(viewModel: ProjectsViewModel())
}