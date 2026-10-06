# Mission: Design a Reliable RP2350 Boot Chain

## Why
Learn microcontroller architecture deeply enough to design, explain, debug, and improve a custom Raspberry Pi Pico 2 W bootloader without treating the SDK or copied examples as magic.

## Success looks like
- Explain every stage from power-on reset through RP2350 Boot ROM, image discovery, startup, and `main()`.
- Inspect an ELF, map file, symbols, sections, vectors, startup code, and generated machine instructions without an IDE.
- Build a custom loader that validates and boots a separately linked application on the Pico 2 W.
- Implement USB updates, A/B images, trial boot, rollback, and power-loss-safe metadata.
- Explain the difference between corruption detection, cryptographic authentication, and RP2350 hardware secure boot.
- Transfer the reasoning process to an unfamiliar MCU datasheet and boot architecture.

## Constraints
- Use one Raspberry Pi Pico 2 W and a data-capable USB cable; assume no Debug Probe, UART adapter, second MCU, logic analyzer, or external components.
- Use a terminal-first workflow on Arch Linux and C++ as the primary language, with C and assembly where the hardware boundary requires them.
- Follow a 32-week curriculum with one detailed 8–10 hour HTML lesson per week.
- Use Cortex-M33 core 0 initially; keep Wi-Fi disabled until the OTA phase.
- Treat the board's current flash contents as disposable and preserve ROM BOOTSEL as the recovery path.

## Out of scope
- Live SWD debugging or electrical signal capture without the missing hardware.
- A physical external-MCU update host.
- Irreversible OTP programming on the only development board.
- Multicore, TrustZone execution, and RISC-V implementation before the Arm boot chain is complete.
