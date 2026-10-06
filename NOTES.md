# Teaching Notes

- Source guide: `RP2350_Pico2W_Custom_Bootloader_Learning_Project.md`.
- Workflow: terminal-first; expose compiler, linker, ELF, UF2, and inspection commands directly.
- Schedule: 32 weeks, one HTML lesson per week, 8–10 hours split into five study/lab blocks.
- Depth: explain every concept needed for the week's work; avoid unexplained addresses, constants, build commands, SDK calls, or handoff steps.
- Language: C++ is already familiar. Concentrate on embedded behavior hidden by desktop C++, using C linkage and assembly when required.
- Hardware: only a Pico 2 W and USB cable. Replace UART with USB CDC and live SWD with offline inspection and runtime evidence. Do not imply these substitutes provide live hardware stepping.
- Board state: current flash may be erased. Every destructive lesson must begin with an exact ROM BOOTSEL recovery procedure.
- Theme: every lesson/reference page supports persistent light/dark mode and clean light printing.
- Safety: no OTP writes on this only board. Discuss irreversible state before presenting any OTP-related command, even read-only tooling.
- Progression: create only the next weekly lesson after reviewing the learner's exit assessment and updating learning records.
