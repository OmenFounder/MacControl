import Foundation
import AppKit

class ScreenStreamer {
    let port: UInt16 = 5051
    var clientHandle: FileHandle?

    func start() {
        let listener = try! SocketListener(port: port)
        print("📡 Screen streamer listening on port \(port)")

        DispatchQueue.global(qos: .userInteractive).async {
            self.clientHandle = listener.accept()
            print("✅ Screen client connected")
            self.streamLoop()
        }
    }

    private func streamLoop() {
        let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { _ in
            guard let imageRef = CGWindowListCreateImage(.infinite, .optionAll, kCGNullWindowID, .bestResolution) else {
                print("❌ Still failing to capture screen image!")
                return
            }

            //print("📷 Captured frame size: \(imageRef.width)x\(imageRef.height)")


            let bitmapRep = NSBitmapImageRep(cgImage: imageRef)
            guard let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.6]) else {
                print("❌ Failed to create JPEG from screen")
                return
            }

            var length = UInt32(jpegData.count).bigEndian
            let header = Data(bytes: &length, count: 4)

            if let client = self.clientHandle {
                do {
                    try client.write(contentsOf: header + jpegData)
                } catch {
                    print("❌ Failed to send frame: \(error)")
                }
            }
        }

        RunLoop.current.add(timer, forMode: .common)
        RunLoop.current.run()
    }
}

class InputReceiver {
    let port: UInt16 = 5050

    func start() {
        let listener = try! SocketListener(port: port)
        print("🎮 Input listener on port \(port)")

        DispatchQueue.global(qos: .userInitiated).async {
            let handle = listener.accept()
            print("✅ Input client connected")
            self.listenLoop(socket: handle)
        }
    }

    private func listenLoop(socket: FileHandle) {
        var buffer = Data()

        while true {
            guard let chunk = try? socket.read(upToCount: 1024), !chunk.isEmpty else { break }
            buffer.append(chunk)

            while let newline = buffer.firstIndex(of: 0x0A) {
                let jsonData = buffer[..<newline]
                buffer = buffer[(newline + 1)...]

                if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                    print("📨 Received input: \(dict)")
                    self.handleInput(dict)
                }
            }
        }
    }

    private var lastMousePosition: CGPoint = .zero

    private func handleInput(_ dict: [String: Any]) {
        guard let x = dict["x"] as? CGFloat, let y = dict["y"] as? CGFloat else { return }
        let pt = CGPoint(x: x, y: y)
        lastMousePosition = pt

        switch dict["type"] as? String {
        case "mouseMove":
            let isDragging = CGEventSource.buttonState(.combinedSessionState, button: .left)
            let type: CGEventType = isDragging ? .leftMouseDragged : .mouseMoved
            CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            print(isDragging ? "🚚 Drag to \(pt)" : "🖱️ Move to \(pt)")

        case "mouseDrag":
            // Explicit drag command from the client — always post as .leftMouseDragged
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            print("🚛 Explicit drag to \(pt)")

        case "mouseDown":
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            print("🖱️ Mouse down at \(pt)")

        case "mouseUp":
            CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            print("🖱️ Mouse up at \(pt)")

        case "keyDown":
            if let keyCode = dict["keyCode"] as? UInt16 {
                CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true)?.post(tap: .cghidEventTap)
                print("⌨️ Key down: \(keyCode)")
            }

        case "keyUp":
            if let keyCode = dict["keyCode"] as? UInt16 {
                CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false)?.post(tap: .cghidEventTap)
                print("⌨️ Key up: \(keyCode)")
            }

        default:
            print("⚠️ Unknown input: \(dict)")
        }
    }

}

// MARK: - Socket Listener

class SocketListener {
    let fileHandle: FileHandle

    init(port: UInt16) throws {
        let socketFD = socket(AF_INET, SOCK_STREAM, 0)
        guard socketFD >= 0 else { throw NSError(domain: "SocketCreateError", code: 1) }

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
RunLoop.main.run()
