import Foundation
import AppKit
import Darwin

signal(SIGPIPE, SIG_IGN) // Prevent crashing on broken pipe


let fileManager = FileManager.default

// Resolve relative path to the built binary
let launchDir = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
let watchedBinaryPath = launchDir
    .appendingPathComponent("../../.build/debug/MacInputForwarder")
    .standardized.path

print("🕵️ Watching for changes to: \(watchedBinaryPath)")

var lastModifiedTime: Date? = try? fileManager
    .attributesOfItem(atPath: watchedBinaryPath)[.modificationDate] as? Date

DispatchQueue.global(qos: .background).async {
    while true {
        sleep(1)

        if let newTime = try? fileManager
            .attributesOfItem(atPath: watchedBinaryPath)[.modificationDate] as? Date,
           let oldTime = lastModifiedTime,
           newTime > oldTime {

            print("🔁 Detected updated build. Restarting from \(watchedBinaryPath)...")
            lastModifiedTime = newTime

            let task = Process()
            task.executableURL = URL(fileURLWithPath: watchedBinaryPath)
            try? task.run()
            exit(0)
        }
    }
}


class ScreenStreamer {
    let port: UInt16 = 5051

    func start() {
        DispatchQueue.global(qos: .userInteractive).async {
            while true {
                do {
                    let listener = try SocketListener(port: self.port)
                    print("📡 Screen streamer listening on port \(self.port)")

                    while true {
                        let client = listener.accept()
                        print("✅ Screen client connected")
                        self.streamLoop(handle: client)
                    }
                } catch {
                    print("❌ Error in screen streamer: \(error)")
                    sleep(1)
                }
            }
        }
    }

    private func streamLoop(handle: FileHandle) {
        let timer = DispatchSource.makeTimerSource(queue: .global(qos: .userInteractive))
        timer.schedule(deadline: .now(), repeating: .milliseconds(33), leeway: .milliseconds(1))

        timer.setEventHandler {
            guard let imageRef = CGWindowListCreateImage(.infinite, .optionAll, kCGNullWindowID, .bestResolution) else {
                print("❌ Failed to capture screen image!")
                return
            }

            let bitmapRep = NSBitmapImageRep(cgImage: imageRef)
            guard let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.6]) else {
                print("❌ Failed to encode JPEG")
                return
            }

            var length = UInt32(jpegData.count).bigEndian
            let header = Data(bytes: &length, count: 4)

            do {
                try handle.write(contentsOf: header + jpegData)
            } catch {
                print("⚠️ Client stream disconnected: \(error)")
                timer.cancel()
            }
        }

        timer.setCancelHandler {
            print("🔁 Stream timer cancelled")
        }

        timer.resume()
        RunLoop.current.run()
    }
}

class InputReceiver {
    let port: UInt16 = 5050

    func start() {
        DispatchQueue.global(qos: .userInteractive).async {
            do {
                let listener = try SocketListener(port: self.port)
                print("🎮 Input listener on port \(self.port)")

                while true {
                    let handle = listener.accept()
                    print("✅ Input client connected")
                    self.listenLoop(socket: handle)
                    print("⚠️ Client disconnected")
                }
            } catch {
                print("❌ Input listener failed: \(error)")
            }
        }
    }

    private func listenLoop(socket: FileHandle) {
        var buffer = Data()
        let fd = socket.fileDescriptor

        // ✅ Make socket non-blocking
        _ = fcntl(fd, F_SETFL, O_NONBLOCK)

        var readBuffer = [UInt8](repeating: 0, count: 1024)

        while true {
            let bytesRead = Darwin.read(fd, &readBuffer, 1024)

            if bytesRead > 0 {
                buffer.append(contentsOf: readBuffer[0..<bytesRead])
            } else if bytesRead == 0 {
                print("⚠️ Input socket closed.")
                break
            } else if errno != EAGAIN && errno != EWOULDBLOCK {
                print("❌ Read error: \(errno)")
                break
            }

            // ✅ Process complete messages
            while let newline = buffer.firstIndex(of: 0x0A) {
                let jsonData = buffer[..<newline]
                buffer = buffer[(newline + 1)...]

                if let jsonArray = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]] {
                    for dict in jsonArray {
                        self.handleInput(dict)
                    }
                } else if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                    self.handleInput(dict)
                } else {
                    print("⚠️ Invalid JSON")
                }
            }

            usleep(1000) // 💡 Yield just a bit
        }
    }

    private func handleInput(_ dict: [String: Any]) {
        let x = dict["x"] as? CGFloat ?? 0
        let y = dict["y"] as? CGFloat ?? 0
        let pt = CGPoint(x: x, y: y)

        switch dict["type"] as? String {
        case "mouseMove":
            let isDragging = CGEventSource.buttonState(.combinedSessionState, button: .left)
            let type: CGEventType = isDragging ? .leftMouseDragged : .mouseMoved
            CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)

        case "mouseDrag":
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)

        case "mouseDown":
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)

        case "mouseUp":
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)

        case "mouseRightDown":
            CGEvent(mouseEventSource: nil, mouseType: .rightMouseDown, mouseCursorPosition: pt, mouseButton: .right)?.post(tap: .cghidEventTap)

        case "mouseRightUp":
            CGEvent(mouseEventSource: nil, mouseType: .rightMouseUp, mouseCursorPosition: pt, mouseButton: .right)?.post(tap: .cghidEventTap)

        case "keyDown":
            if let keyCode = dict["keyCode"] as? UInt16 {
                print("KeyCodeFound: \(keyCode)")
                CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true)?.post(tap: .cghidEventTap)
            }

        case "keyUp":
            if let keyCode = dict["keyCode"] as? UInt16 {
                CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false)?.post(tap: .cghidEventTap)
            }

        default:
            print("⚠️ Unknown input: \(dict)")
        }
    }
}

class SocketListener {
    let fileHandle: FileHandle

    init(port: UInt16) throws {
        let socketFD = socket(AF_INET, SOCK_STREAM, 0)
        guard socketFD >= 0 else { throw NSError(domain: "SocketCreateError", code: 1) }

        var flag = 1
        setsockopt(socketFD, IPPROTO_TCP, TCP_NODELAY, &flag, socklen_t(MemoryLayout.size(ofValue: flag)))

        var addr = sockaddr_in(
            sin_len: UInt8(MemoryLayout<sockaddr_in>.stride),
            sin_family: sa_family_t(AF_INET),
            sin_port: port.bigEndian,
            sin_addr: in_addr(s_addr: INADDR_ANY),
            sin_zero: (0,0,0,0,0,0,0,0)
        )

        let bindResult = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                bind(socketFD, $0, socklen_t(MemoryLayout<sockaddr_in>.stride))
            }
        }

        guard bindResult >= 0 else { throw NSError(domain: "BindFailed", code: 2) }
        listen(socketFD, 1)

        fileHandle = FileHandle(fileDescriptor: socketFD, closeOnDealloc: true)
    }

    func accept() -> FileHandle {
        let fd = Darwin.accept(fileHandle.fileDescriptor, nil, nil)
        return FileHandle(fileDescriptor: fd, closeOnDealloc: true)
    }
}

// MARK: - Run

let streamer = ScreenStreamer()
let input = InputReceiver()
streamer.start()
input.start()

let group = DispatchGroup()
group.enter() // Block forever
group.wait()
