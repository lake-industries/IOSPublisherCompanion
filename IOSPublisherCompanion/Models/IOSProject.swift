import Foundation

struct IOSProject: Identifiable, Codable {
    let id: String
    var name: String
    var bundleId: String
    var teamId: String
    var version: String = "1.0.0"
    var code: String = ""
    var createdDate: Date = Date()
    var lastModified: Date = Date()
    
    mutating func updateCode(_ newCode: String) {
        code = newCode
        lastModified = Date()
    }
}