export class KeyCode {
    private static readonly windowsToMacMap: Record<number, number> = {
      // Letters A-Z
      65: 0,   // A
      66: 11,  // B
      67: 8,   // C
      68: 2,   // D
      69: 14,  // E
      70: 3,   // F
      71: 5,   // G
      72: 4,   // H
      73: 34,  // I
      74: 38,  // J
      75: 40,  // K
      76: 37,  // L
      77: 46,  // M
      78: 45,  // N
      79: 31,  // O
      80: 35,  // P
      81: 12,  // Q
      82: 15,  // R
      83: 1,   // S
      84: 17,  // T
      85: 32,  // U
      86: 9,   // V
      87: 13,  // W
      88: 7,   // X
      89: 16,  // Y
      90: 6,   // Z
  
      // Numbers 0–9 (Top row)
      48: 29,  // 0
      49: 18,  // 1
      50: 19,  // 2
      51: 20,  // 3
      52: 21,  // 4
      53: 23,  // 5
      54: 22,  // 6
      55: 26,  // 7
      56: 28,  // 8
      57: 25,  // 9
  
      // Symbols (based on U.S. layout)
      186: 41, // ;
      187: 24, // =
      188: 43, // ,
      189: 27, // -
      190: 47, // .
      191: 44, // /
      192: 50, // `
      219: 33, // [
      220: 42, // \
      221: 30, // ]
      222: 39, // '
  
      // Modifier Keys
      16: 56,  // Shift
      17: 59,  // Control
      18: 58,  // Option (Alt)
      91: 55,  // Command (Left)
      93: 55,  // Command (Right) – fallback
  
      // Navigation
      8: 51,   // Backspace
      9: 48,   // Tab
      13: 36,  // Enter
      27: 53,  // Escape
      32: 49,  // Space
      37: 123, // Left Arrow
      38: 126, // Up Arrow
      39: 124, // Right Arrow
      40: 125, // Down Arrow
      46: 117, // Delete
      36: 115, // Home
      35: 119, // End
      33: 116, // Page Up
      34: 121, // Page Down
  
      // Function Keys (F1–F12)
      112: 122, // F1
      113: 120, // F2
      114: 99,  // F3
      115: 118, // F4
      116: 96,  // F5
      117: 97,  // F6
      118: 98,  // F7
      119: 100, // F8
      120: 101, // F9
      121: 109, // F10
      122: 103, // F11
      123: 111, // F12
    };
  
    public static getKeyCode(winKeyCode: number): number | undefined {
      return this.windowsToMacMap[winKeyCode];
    }
  }
  