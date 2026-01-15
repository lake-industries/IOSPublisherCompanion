import SwiftUI

struct ProjectsView: View {
    @EnvironmentObject private var viewModel: ProjectsViewModel
    @State private var showingNewProject = false
    
    var body: some View {
        NavigationStack {
            List {
                if viewModel.projects.isEmpty {
                    VStack(alignment: .center, spacing: 12) {
                        Image(systemName: "folder.badge.plus")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("No Projects")
                            .font(.headline)
                        Text("Create your first iOS project")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
                } else {
                    ForEach($viewModel.projects) { $project in
                        NavigationLink(destination: ProjectDetailView(project: $project)) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(project.name)
                                    .font(.headline)
                                Text(project.bundleId)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                HStack {
                                    Label("v\(project.version)", systemImage: "tag.fill")
                                        .font(.caption2)
                                        .foregroundColor(.blue)
                                    Spacer()
                                    Text(project.lastModified.formatted(date: .abbreviated, time: .omitted))
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .onDelete(perform: deleteProjects)
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingNewProject = true }) {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingNewProject) {
                NewProjectSheet(viewModel: viewModel)
            }
        }
    }
    
    private func deleteProjects(at offsets: IndexSet) {
        offsets.forEach { index in
            viewModel.deleteProject(viewModel.projects[index].id)
        }
    }
}

#Preview {
    ProjectsView()
        .environmentObject(ProjectsViewModel())
}