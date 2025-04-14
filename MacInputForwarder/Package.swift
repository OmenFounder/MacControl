// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "MacInputForwarder",
    platforms: [
        .macOS(.v11)
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "MacInputForwarder",
            dependencies: []
        )
    ]
)
