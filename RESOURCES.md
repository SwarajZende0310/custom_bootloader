# RP2350 Custom Bootloader Resources

## Knowledge

- [RP2350 Datasheet](https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf)
  Primary silicon reference. Use for: memory, reset, Cortex-M33 integration, Boot ROM, image definitions, partitions, QMI/XIP, flash, watchdog, OTP, and security. Start with Chapter 5 only after the course establishes the basic reset model.
- [Raspberry Pi Pico 2 W product documentation](https://pip.raspberrypi.com/categories/1088-raspberry-pi-pico-2-w)
  Official board-level documents. Use for: current Pico 2 W datasheet, pinout, schematic, wireless subsystem, and board-specific electrical facts.
- [Raspberry Pi Pico 2 W schematic](https://pip-assets.raspberrypi.com/categories/1088-raspberry-pi-pico-2-w/documents/RP-008306-DS-1-pico-2-w-schematic.pdf)
  Authoritative wiring. Use for: BOOTSEL, 4 MiB external flash, CYW43439 connections, onboard LED, and the distinction between MCU and board.
- [Getting Started with Raspberry Pi Pico-series](https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf)
  Official build, UF2, USB, and debug workflow guide. Use for: the initial toolchain, BOOTSEL procedure, build artifacts, and what cannot be done without an SWD probe.
- [Pico-series board documentation](https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html)
  Maintained board documentation. Use for: ROM BOOTSEL recovery, identifying programmed devices, and supported development workflows.
- [Pico C/C++ SDK documentation, release 2.3.0](https://www.raspberrypi.com/documentation/pico-sdk/)
  API-level reference. Use for: tracing SDK calls, runtime infrastructure, flash APIs, reset APIs, and board support.
- [Raspberry Pi Pico SDK source](https://github.com/raspberrypi/pico-sdk/tree/2.3.0)
  Source of the SDK abstractions and startup machinery. Use for: following a public API down to register operations and inspecting RP2350 startup/linker support.
- [Raspberry Pi Pico examples](https://github.com/raspberrypi/pico-examples)
  Official example programs. Use for: comparison after deriving an approach, especially USB, watchdog, flash partitions, and RP2350 bootloader examples.
- [`picotool`](https://github.com/raspberrypi/picotool)
  Official host utility for RP-series binaries and BOOTSEL devices. Use for: binary metadata, load/save/verify, partitions, reboot, UF2, and later signed-image tooling.
- [RP2350 Boot ROM source](https://github.com/raspberrypi/pico-bootrom-rp2350)
  Reference implementation of the immutable ROM. Use only after the documented Boot ROM concepts and algorithms are understood.
- [UF2 specification](https://github.com/microsoft/uf2)
  Primary format specification. Use for: understanding why a UF2 is a transport container rather than the raw executable image.

## Wisdom (Communities)

- [Raspberry Pi Forums — Microcontrollers](https://forums.raspberrypi.com/viewforum.php?f=143)
  Practitioner and Raspberry Pi engineer discussions. Use for: comparing real failure reports and asking hardware-specific questions after collecting evidence.
- [Raspberry Pi Pico SDK issues](https://github.com/raspberrypi/pico-sdk/issues)
  Maintainer-triaged implementation history. Use for: verifying whether surprising SDK behavior is understood, version-specific, or a genuine defect; search before posting.

## Gaps

- Select and annotate the exact official Arm Cortex-M33 and Armv8-M architecture references before Week 5.
- Add focused primary references for USB CDC/TinyUSB before Week 22 and cryptographic primitives before Week 29.
- Live SWD practice and logic-analyzer evidence remain unavailable with the one-board hardware constraint.
