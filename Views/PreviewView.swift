import SwiftUI

struct PreviewView: View {
    @EnvironmentObject private var viewModel: ProjectsViewModel
    @State private var selectedProjectId: String?
    
    var selectedProject: IOSProject? {
        guard let id = selectedProjectId else { return nil }
        return viewModel.projects.first { $0.id == id }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let project = selectedProject {
                    // Project Picker
                    Picker("Project", selection: $selectedProjectId) {
                        ForEach(viewModel.projects) { proj in
                            Text(proj.name).tag(proj.id as String?)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding()
                    
                    Divider()
                    
                    // Code Preview
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Swift Code Preview")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            if project.code.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "doc.text")
                                        .font(.system(size: 48))
                                        .foregroundColor(.gray)
                                    Text("No code yet")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                    Text("Edit code in the Editor tab")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                                .padding()
                            } else {
                                CodeDisplayView(code: project.code)
                                    .padding()
                            }
                            
                            Spacer()
                        }
                    }
                    
                    // Export Button
                    Button(action: { }) {
                        HStack {
                            Image(systemName: "arrow.up.doc")
                            Text("Export for Xcode")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .padding()
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "eye.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("Select a Project")
                            .font(.headline)
                        Text("Choose a project to preview")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
            }
            .navigationTitle("Preview")
        }
        .onAppear {
            selectedProjectId = viewModel.projects.first?.id
        }
    }
}

struct CodeDisplayView: View {
    let code: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "doc.text")
                Text("Code")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.bottom, 8)
            
            ZStack(alignment: .topLeading) {
                // Background
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray6))
                
                // Code Text
                VStack(alignment: .leading) {
                    Text(code)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.primary)
                        .lineLimit(nil)
                    Spacer()
                }
                .padding(12)
            }
            .frame(minHeight: 200)
        }
    }
}

#Preview {
    @State var viewModel = ProjectsViewModel()
    
    return PreviewView()
        .environmentObject(viewModel)
}