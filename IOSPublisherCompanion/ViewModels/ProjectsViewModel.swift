import Foundation

@MainActor
class ProjectsViewModel: ObservableObject {
    @Published var projects: [IOSProject] = []
    @Published var selectedProject: IOSProject?
    
    private let storageKey = "iosAppPublisherProjects"
    
    init() {
        load()
    }
    
    func addProject(_ project: IOSProject) {
        projects.append(project)
        save()
    }
    
    func updateProject(_ project: IOSProject) {
        if let index = projects.firstIndex(where: { $0.id == project.id }) {
            projects[index] = project
            save()
        }
    }
    
    func deleteProject(_ id: String) {
        projects.removeAll { $0.id == id }
        save()
    }
    
    func getProject(_ id: String) -> IOSProject? {
        projects.first { $0.id == id }
    }
    
    private func save() {
        if let encoded = try? JSONEncoder().encode(projects) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }
    
    func load() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let decoded = try? JSONDecoder().decode([IOSProject].self, from: data) {
            projects = decoded
        }
    }
}