# RP2350 / Raspberry Pi Pico 2 W Custom Bootloader Learning Project

> **Purpose of this document:**  
> This is a complete learning and implementation specification intended to be given to **Codex** (or another coding assistant) as the working context for a long-term embedded-systems learning project.
>
> The goal is **not merely to obtain a working bootloader**.  
> The primary goal is to understand microcontroller architecture deeply enough that the learner can explain, debug, modify, and eventually design a boot process without blindly copying SDK examples.

---

# 1. Role for Codex

Act as an **embedded systems mentor, firmware reviewer, debugger, and pair programmer**.

The learner wants to understand every important layer between:

```text
Power applied
    ↓
Reset
    ↓
CPU boot ROM
    ↓
Boot image discovery
    ↓
Flash / SRAM mapping
    ↓
Vector table / startup
    ↓
C / C++ runtime initialization
    ↓
main()
    ↓
Application
```

Do **not** optimize primarily for speed of completing the project.

Optimize for:

1. architectural understanding,
2. ability to derive behavior from datasheets,
3. ability to debug with GDB/OpenOCD,
4. ability to inspect generated machine code,
5. understanding of compiler/linker/startup interactions,
6. understanding of flash and memory behavior,
7. bootloader reliability,
8. ability to explain trade-offs,
9. eventual secure-boot understanding,
10. transferability to other microcontrollers.

Whenever code is produced, explain which hardware or runtime concept the code exercises.

---

# 2. Learner Background

Assume the learner:

- uses **C++ as the primary programming language**,
- has decent general C++ knowledge,
- previously worked a little with:
  - Intel 8051,
  - Arduino Uno,
  - ATmega328P,
- has not worked deeply with those MCUs recently,
- therefore requires a refresher,
- wants to move away from Arduino-style abstraction toward:
  - register-level programming,
  - bare-metal programming,
  - startup code,
  - linker scripts,
  - debugging,
  - bootloaders,
  - firmware-update architectures,
  - MCU architecture.

Do not spend excessive time teaching basic C++ syntax.

Spend time on concepts that normal desktop C++ development hides:

- memory layout,
- volatile,
- MMIO,
- linker scripts,
- startup code,
- interrupt vectors,
- ABI,
- stack,
- heap,
- binary formats,
- reset behavior,
- flash programming,
- exception entry,
- interrupt masking,
- image relocation,
- CPU privilege/security modes.

---

# 3. Target Hardware

Primary target:

```text
Raspberry Pi Pico 2 W
MCU: RP2350
Primary CPU architecture for this project: Arm Cortex-M33
```

The RP2350 is especially useful for this project because it supports:

- dual Cortex-M33 processors,
- Hazard3 RISC-V processors,
- external QSPI flash,
- execute-in-place,
- SRAM execution,
- immutable internal boot ROM,
- USB boot,
- UART boot,
- partition metadata,
- image metadata,
- secure boot,
- signed images,
- OTP configuration,
- SHA-256 hardware,
- TrustZone-related capabilities,
- A/B-style firmware architectures.

For the initial project:

```text
Use Cortex-M33.
Use core 0 only.
Ignore Wi-Fi.
Ignore Bluetooth.
Ignore RISC-V.
Ignore TrustZone.
Ignore secure boot.
Ignore multicore operation.
```

Those features should be introduced later.

---

# 4. Hardware Recommended

Minimum useful setup:

```text
Raspberry Pi Pico 2 W
Raspberry Pi Debug Probe
USB cable
Breadboard
LED + resistor
jumper wires
```

Strongly recommended:

```text
USB-UART adapter
cheap 8-channel logic analyzer
multimeter
```

Optional later:

```text
Arduino Uno / ATmega328P
second Pico / Pico 2
external SPI NOR flash board
```

The **Debug Probe is more important than the external boot MCU initially**.

---

# 5. Tools to Learn

The learner should become comfortable using:

```text
cmake
ninja / make
arm-none-eabi-gcc
arm-none-eabi-g++
arm-none-eabi-objdump
arm-none-eabi-objcopy
arm-none-eabi-readelf
arm-none-eabi-nm
arm-none-eabi-size
gdb
OpenOCD
picotool
git
```

Also learn:

```text
hexdump
xxd
file
strings
readelf
objdump
nm
```

The learner should be able to inspect an ELF without an IDE.

---

# 6. Official References

Prefer official Raspberry Pi documentation and source code.

## RP2350

RP2350 product documentation:

https://pip.raspberrypi.com/categories/1214-rp2350

RP2350 datasheet:

https://pip-assets.raspberrypi.com/categories/1214-rp2350/documents/RP-008373-DS-2-rp2350-datasheet.pdf

Important datasheet areas:

- processor architecture,
- memory map,
- boot ROM,
- boot ROM concepts,
- boot image format,
- partitions,
- UART boot,
- QMI / QSPI,
- XIP,
- SRAM,
- resets,
- clocks,
- OTP,
- security,
- SHA-256,
- debug.

## Pico SDK

https://www.raspberrypi.com/documentation/pico-sdk/

Hardware APIs:

https://www.raspberrypi.com/documentation/pico-sdk/hardware.html

## Pico Examples

https://github.com/raspberrypi/pico-examples

Important examples to inspect later:

```text
bootloaders/encrypted
bootloaders/uart_boot
flash/partition_info
universal
hello_uart
uart_advanced
```

## RP2350 Boot ROM Source

https://github.com/raspberrypi/pico-bootrom-rp2350

Read this only after the learner understands the boot ROM concepts chapter.

## Debug Probe

https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html

## picotool

https://github.com/raspberrypi/picotool

---

# 7. Fundamental Architecture: What Is Being Built?

The first custom bootloader should use the RP2350's normal immutable boot ROM.

Conceptually:

```text
Power
  │
  ▼
┌───────────────────────────┐
│ RP2350 immutable Boot ROM │
└─────────────┬─────────────┘
              │
              ▼
       External QSPI flash
┌───────────────────────────────┐
│ boot metadata / partitions    │
├───────────────────────────────┤
│ custom bootloader             │
├───────────────────────────────┤
│ application A                 │
├───────────────────────────────┤
│ application B                 │
├───────────────────────────────┤
│ persistent boot state         │
└───────────────────────────────┘
```

The custom bootloader **does not replace the mask ROM**.

Instead:

```text
Reset
 ↓
RP2350 Boot ROM
 ↓
Custom bootloader
 ↓
Validate/select application
 ↓
Application startup
 ↓
main()
```

---

# 8. Separate External Bootloader Chip

A separate MCU can participate in booting or updating the RP2350.

Possible architecture:

```text
         Host MCU
      ATmega / RP2040
      / another MCU
           │
           │ UART / SPI / GPIO / RESET
           ▼
        RP2350
           │
           ▼
       Firmware
```

The RP2350 specifically includes a **UART boot mode** intended for bootstrapping a device from another host.

Important limitation:

The UART boot mechanism uses QSPI-related pins and is particularly suitable for flashless or specially designed boards.

Because the Pico 2 W already has external flash wired to the RP2350 QSPI interface, **do not begin the learning project with an external boot MCU**.

Instead implement it later as an advanced stage.

Recommended project sequence:

```text
Custom bootloader in Pico flash
        ↓
UART firmware updater
        ↓
A/B firmware
        ↓
power-failure recovery
        ↓
external MCU update host
        ↓
secure boot
        ↓
Wi-Fi OTA
```

---

# 9. Learning Philosophy

For every major topic, follow this loop:

```text
Theory
  ↓
Datasheet
  ↓
Minimal code
  ↓
Compile
  ↓
Inspect ELF
  ↓
Inspect assembly
  ↓
Run hardware
  ↓
Debug using SWD
  ↓
Break it intentionally
  ↓
Diagnose failure
  ↓
Explain the mechanism
```

Do not accept "it works" as proof of understanding.

For every milestone Codex should ask questions such as:

- What register changed?
- Why is this address used?
- Where did the stack pointer come from?
- Where is `.data` stored before reset?
- Why is `.bss` not physically stored in flash?
- Who initializes global C++ constructors?
- What does the linker know that the compiler does not?
- What instruction causes the jump?
- What state survives reset?
- What happens if power fails here?
- Why must interrupts be disabled before handoff?
- What happens if an interrupt fires using the old vector table?
- Why can flash not simply be overwritten byte-by-byte?

---

# 10. Phase 0 — Refresh Embedded C/C++ Using ATmega328P

## Goal

Rebuild microcontroller intuition using a simpler architecture before RP2350.

Avoid Arduino APIs where possible.

## Topics

Refresh:

- CPU registers,
- program counter,
- stack pointer,
- SRAM,
- flash,
- EEPROM,
- GPIO,
- timers,
- UART,
- SPI,
- I2C,
- interrupts,
- watchdog,
- reset,
- clock,
- memory-mapped / register-based peripherals.

Understand:

```text
Arduino API
    ↓
AVR library
    ↓
register access
    ↓
peripheral
    ↓
pin
```

## Exercises

### Exercise 0.1 — Direct GPIO

Do not use:

```cpp
digitalWrite()
pinMode()
```

Configure GPIO directly through registers.

Tasks:

1. configure LED pin as output,
2. set output high,
3. clear output,
4. toggle pin,
5. inspect datasheet register description.

Explain:

- DDR register,
- PORT register,
- PIN register,
- bit masking.

---

### Exercise 0.2 — Timer Interrupt

Configure a hardware timer manually.

Requirements:

- no Arduino timing functions,
- ISR toggles an LED,
- calculate timer reload / compare value manually.

Explain:

```text
CPU clock
 ↓
prescaler
 ↓
timer tick
 ↓
compare
 ↓
interrupt
 ↓
ISR
```

---

### Exercise 0.3 — UART

Configure UART from registers.

Send:

```text
Hello from bare metal AVR
```

Understand:

- baud-rate divisor,
- TX data register,
- status flags,
- polling,
- interrupt-driven UART.

---

### Exercise 0.4 — Disassembly

Compile:

```cpp
volatile uint8_t *reg = ...;
*reg |= mask;
```

Inspect assembly.

Explain:

- load,
- OR,
- store,
- volatile effect.

---

## Completion Criteria

Learner can explain:

- difference between flash and SRAM,
- where code executes,
- what an interrupt is,
- what happens on reset,
- why peripheral registers are special,
- what `volatile` does and does not guarantee.

---

# 11. Phase 1 — C/C++ Compilation Model

This phase is mandatory before bootloader development.

## Learn the pipeline

```text
source.cpp
    ↓
preprocessor
    ↓
compiler
    ↓
assembly
    ↓
assembler
    ↓
object file
    ↓
linker
    ↓
ELF
    ↓
objcopy
    ↓
BIN / HEX / UF2
```

## Topics

Learn:

- translation units,
- object files,
- symbols,
- undefined symbols,
- relocation,
- sections,
- linker,
- linker script,
- executable entry point,
- ELF program headers,
- ELF section headers.

Important sections:

```text
.text
.rodata
.data
.bss
.init_array
.stack
.heap
```

## Critical distinction

Understand:

```text
Load Memory Address
vs
Virtual / Runtime Memory Address
```

For embedded systems this often becomes:

```text
.data initial values stored in FLASH
             ↓
startup copies them
             ↓
.data executes / lives in SRAM
```

---

# 12. Phase 2 — ELF Inspection Lab

Create a trivial firmware and inspect it with:

```bash
arm-none-eabi-readelf -h firmware.elf
arm-none-eabi-readelf -S firmware.elf
arm-none-eabi-readelf -s firmware.elf
arm-none-eabi-objdump -d firmware.elf
arm-none-eabi-objdump -h firmware.elf
arm-none-eabi-nm -n firmware.elf
arm-none-eabi-size firmware.elf
```

Questions Codex should require the learner to answer:

1. Where is `main`?
2. Where is `Reset_Handler`?
3. Where is the vector table?
4. Where is a global variable stored?
5. Where is a `const` global stored?
6. How large is `.bss`?
7. Why does `.bss` not significantly increase the BIN file?
8. Where are C++ constructors represented?
9. What symbol represents the initial stack?
10. Which address does the linker assign to the firmware?

---

# 13. Phase 3 — Cortex-M33 Fundamentals

The first RP2350 bootloader should use Cortex-M33.

## Learn registers

Understand:

```text
R0-R12
R13 = SP
R14 = LR
R15 = PC
xPSR
CONTROL
PRIMASK
BASEPRI
FAULTMASK
```

Understand stack pointers:

```text
MSP
PSP
```

Initially focus on MSP.

---

# 14. Cortex-M Exception Model

Understand:

- Reset,
- NMI,
- HardFault,
- SVCall,
- PendSV,
- SysTick,
- peripheral interrupts,
- NVIC.

Understand exception stacking.

Conceptually an interrupt causes hardware to save processor context such as:

```text
R0
R1
R2
R3
R12
LR
PC
xPSR
```

Then the CPU jumps to the exception handler.

Learn why this is important for:

- RTOS context switching,
- debugging,
- HardFault analysis,
- bootloader handoff.

---

# 15. Cortex-M Vector Table

Understand conceptually:

```text
Vector table
┌────────────────────────┐
│ initial stack pointer  │
├────────────────────────┤
│ Reset_Handler          │
├────────────────────────┤
│ NMI_Handler            │
├────────────────────────┤
│ HardFault_Handler      │
├────────────────────────┤
│ ...                    │
└────────────────────────┘
```

Learn:

- reset vectors,
- interrupt vectors,
- VTOR,
- vector relocation.

Exercise:

Inspect the vector table directly in:

```text
ELF
binary
GDB memory
```

---

# 16. Phase 4 — RP2350 Architecture

Study the RP2350 block diagram and memory map.

Learn:

- Cortex-M33 cores,
- Hazard3 RISC-V cores,
- SRAM banks,
- boot ROM,
- QMI,
- QSPI flash,
- XIP,
- DMA,
- PIO,
- UART,
- SPI,
- I2C,
- timers,
- watchdog,
- clocks,
- PLL,
- reset controller,
- SWD,
- OTP,
- SHA-256.

Do not memorize all register addresses.

Understand how to locate them from the datasheet.

---

# 17. Memory-Mapped I/O

Understand the pattern:

```cpp
volatile uint32_t *reg =
    reinterpret_cast<volatile uint32_t *>(ADDRESS);

*reg = value;
```

Explain:

```text
CPU store instruction
       ↓
address decoder
       ↓
system bus
       ↓
peripheral register
       ↓
hardware behavior
```

Topics:

- MMIO,
- `volatile`,
- atomic set/clear/xor aliases where applicable,
- race conditions,
- read-modify-write,
- peripheral side effects.

---

# 18. Phase 5 — Pico SDK First Contact

Create standard Pico SDK applications:

1. blink,
2. UART print,
3. timer,
4. interrupt,
5. watchdog.

Do not stop at the SDK function.

For each SDK call:

```cpp
gpio_init(pin);
gpio_set_dir(pin, GPIO_OUT);
gpio_put(pin, true);
```

trace:

```text
SDK API
 ↓
SDK implementation
 ↓
register operations
 ↓
hardware peripheral
```

---

# 19. Phase 6 — Register-Level RP2350 GPIO

Reimplement a basic LED output without relying on high-level GPIO helper functions.

Goals:

- locate register definitions,
- understand IO bank,
- understand pad control,
- understand output-enable path,
- understand GPIO function selection.

Verify using:

- GDB,
- memory inspection,
- logic analyzer.

---

# 20. Phase 7 — Clock and Reset Understanding

Bootloaders frequently execute before normal application initialization.

Understand:

```text
oscillator
 ↓
PLL
 ↓
clock mux
 ↓
system clock
 ↓
peripheral clock
```

Learn:

- reset controller,
- peripheral reset,
- clock enable,
- watchdog reset,
- software reset,
- power-on reset.

Questions:

- What clock exists immediately after reset?
- Which peripherals are initialized by boot ROM?
- Which state should the bootloader leave for the application?
- Should the application assume bootloader clock configuration?

---

# 21. Phase 8 — Write a Minimal Startup Runtime

Before writing the bootloader, create firmware where the learner understands the code before `main()`.

Implement a minimal startup sequence.

Conceptually:

```text
Reset_Handler
    │
    ├── initialize stack
    ├── copy .data FLASH → SRAM
    ├── clear .bss
    ├── initialize runtime
    ├── call C++ constructors
    └── main()
```

The exact RP2350 boot/image rules must follow the official documentation.

---

# 22. `.data` Initialization

Example:

```cpp
int counter = 123;
```

At build time:

```text
FLASH contains initial value 123
```

At runtime:

```text
SRAM contains counter
```

Startup copies:

```text
FLASH
  │
  │ memcpy
  ▼
SRAM
```

Learner must inspect both addresses in the ELF/map file.

---

# 23. `.bss` Initialization

Example:

```cpp
int buffer[1000];
```

Startup should zero the memory.

Conceptually:

```text
SRAM .bss
xxxxxxxxxxxx
     ↓
memset(0)
     ↓
000000000000
```

Explain why the executable does not need to contain 4000 zero bytes.

---

# 24. C++ Runtime Initialization

Since the learner uses C++, study:

```text
global objects
static objects
.init_array
constructors
destructors
__libc_init_array or equivalent runtime mechanisms
```

Example:

```cpp
class Example {
public:
    Example() {
        // observable side effect
    }
};

Example object;
```

Determine when its constructor executes relative to `main()`.

---

# 25. Phase 9 — Write a Linker Script

Create a minimal linker script.

Understand:

```ld
MEMORY
{
    FLASH (...) : ORIGIN = ..., LENGTH = ...
    RAM   (...) : ORIGIN = ..., LENGTH = ...
}
```

Then place sections.

Conceptual example only:

```ld
SECTIONS
{
    .text : { *(.text*) } > FLASH
    .rodata : { *(.rodata*) } > FLASH
    .data : { *(.data*) } > RAM AT > FLASH
    .bss : { *(.bss*) } > RAM
}
```

Do not blindly copy addresses.

Derive addresses from the RP2350 memory map and project partition layout.

---

# 26. Linker Map Files

Always generate a `.map`.

Learn to answer:

- how large is bootloader `.text`?
- what consumes flash?
- what consumes RAM?
- where is the vector table?
- where does application begin?
- are bootloader and application overlapping?
- where is persistent metadata?

---

# 27. Phase 10 — Understand QSPI NOR Flash

Bootloader development requires understanding flash hardware.

Learn:

- page programming,
- sector erase,
- block erase,
- erase-before-write,
- flash wear,
- write endurance,
- page boundaries,
- status register,
- busy state,
- power-loss behavior.

Critical property:

Flash programming typically changes bits:

```text
1 → 0
```

Returning bits:

```text
0 → 1
```

normally requires erase.

---

# 28. Execute in Place — XIP

Understand:

```text
CPU instruction fetch
        ↓
XIP address
        ↓
XIP cache
        ↓
QMI / QSPI interface
        ↓
external flash
```

Questions:

- Is code literally inside the MCU?
- How can CPU execute external flash?
- What happens while flash is being erased?
- Can code execute from flash while the same flash device is being reprogrammed?
- Why might flash update routines need SRAM execution?

---

# 29. Phase 11 — RP2350 Boot ROM

Study the boot ROM concepts chapter.

Understand:

```text
reset
 ↓
immutable ROM
 ↓
boot mode detection
 ↓
image discovery
 ↓
metadata validation
 ↓
image selection
 ↓
execution
```

Do not begin by reading thousands of lines of boot ROM source.

First understand the documented algorithm.

Then inspect:

https://github.com/raspberrypi/pico-bootrom-rp2350

---

# 30. Boot ROM vs Custom Bootloader

Keep the distinction explicit.

```text
BOOT ROM
```

Properties:

- inside RP2350 silicon,
- immutable,
- provided by Raspberry Pi,
- runs first.

```text
CUSTOM BOOTLOADER
```

Properties:

- written by learner,
- stored in flash,
- replaceable,
- selects/updates application.

---

# 31. Phase 12 — First Custom Bootloader

Initial functionality:

```text
bootloader starts
 ↓
print diagnostics over UART
 ↓
find application
 ↓
perform simple validation
 ↓
jump to application
```

Do NOT implement firmware updating yet.

First prove application handoff.

---

# 32. Proposed Flash Layout

The actual layout must be derived from RP2350 partition/image requirements.

Conceptually:

```text
External flash

+-----------------------------+
| boot metadata / partitions  |
+-----------------------------+
| custom bootloader           |
+-----------------------------+
| application A               |
|                             |
+-----------------------------+
| application B               |
|                             |
+-----------------------------+
| boot state / metadata       |
+-----------------------------+
```

Do not hard-code arbitrary addresses without documenting why they are safe.

---

# 33. Application Link Address

The bootloader application and user application cannot casually overlap.

Example concept:

```text
bootloader:
0x1000....
to
0x100X....

application:
0x100Y....
```

The application must be linked for the actual application region.

Learner should prove this using:

```bash
arm-none-eabi-readelf
arm-none-eabi-nm
arm-none-eabi-objdump
```

---

# 34. Bootloader-to-Application Handoff

This deserves its own laboratory.

Conceptually a Cortex-M handoff involves:

```text
disable interrupts
 ↓
stop bootloader-owned peripherals if necessary
 ↓
clear pending interrupt state as required
 ↓
set vector table
 ↓
restore expected execution environment
 ↓
load application's stack
 ↓
branch to application entry/reset path
```

RP2350 image chaining should follow the appropriate RP2350 boot ROM mechanisms where recommended.

Do not blindly use an RP2040 or STM32 handoff example.

---

# 35. Things That Can Break During Handoff

Create deliberate failure experiments:

### Failure 1

Do not relocate vector table.

Observe what happens when application interrupt fires.

### Failure 2

Leave UART/timer interrupt enabled.

Observe stale bootloader interrupt behavior.

### Failure 3

Link application at wrong address.

Inspect PC and fault state.

### Failure 4

Corrupt application vector / metadata.

Ensure bootloader refuses to boot.

### Failure 5

Leave watchdog configured.

Observe unexpected reset.

---

# 36. HardFault Debugging

Learn to diagnose faults using:

- PC,
- LR,
- SP,
- xPSR,
- fault status registers,
- stacked exception frame,
- disassembly.

Do not fix HardFaults using random code changes.

Always identify the faulting instruction.

---

# 37. Phase 13 — Firmware Image Header

Create an application metadata structure conceptually like:

```cpp
struct FirmwareHeader
{
    uint32_t magic;
    uint32_t format_version;
    uint32_t image_size;
    uint32_t firmware_version;
    uint32_t crc32;
};
```

Later extend with:

```text
build ID
timestamp
hardware compatibility
minimum bootloader version
cryptographic hash
signature
```

Do not confuse custom metadata with RP2350-required image metadata.

---

# 38. Phase 14 — CRC32 Validation

Implement:

```text
read firmware
 ↓
calculate CRC32
 ↓
compare header CRC
 ↓
valid?
```

Test:

1. valid firmware,
2. one bit corrupted,
3. wrong image length,
4. erased flash,
5. partially programmed firmware.

Explain:

CRC detects accidental corruption.

CRC does **not** provide authenticity.

---

# 39. Phase 15 — UART Firmware Update

Implement firmware transfer over a normal UART peripheral.

Suggested simple protocol:

```text
HOST → BOOTLOADER

HELLO
START_UPDATE
image_size
firmware_version
data chunks
CRC
END
```

Bootloader responds:

```text
ACK
NACK
ERROR
READY
COMPLETE
```

Do not optimize immediately.

First prioritize correctness.

---

# 40. UART Protocol Reliability

Later add:

- packet sequence numbers,
- length field,
- per-packet CRC,
- timeout,
- retry,
- framing,
- escape mechanism,
- progress reporting.

Suggested frame concept:

```text
SOF
type
sequence
length
payload
CRC
```

---

# 41. Host-Side Firmware Tool

Write a PC-side updater.

Language may be:

```text
Python
```

or C++.

It should:

```text
open serial port
 ↓
handshake
 ↓
send metadata
 ↓
send chunks
 ↓
retry failures
 ↓
verify
 ↓
command reboot
```

Codex should keep protocol definitions in one shared specification.

---

# 42. Phase 16 — Flash Programming

Implement:

```text
erase destination
 ↓
program flash
 ↓
read back
 ↓
verify
```

Learn:

- alignment,
- flash-page constraints,
- erase granularity,
- execution restrictions while flash operations occur,
- critical sections.

---

# 43. Phase 17 — Boot State Machine

Replace scattered `if` statements with an explicit boot state model.

Example:

```text
RESET
  ↓
LOAD_METADATA
  ↓
CHECK_UPDATE
  ↓
SELECT_IMAGE
  ↓
VERIFY_IMAGE
  ↓
BOOT
```

Recovery paths:

```text
VERIFY FAILED
      ↓
TRY FALLBACK
      ↓
RECOVERY MODE
```

---

# 44. Phase 18 — A/B Firmware

Implement two application slots:

```text
Slot A
Slot B
```

Normal operation:

```text
running A
 ↓
download B
 ↓
validate B
 ↓
mark B pending
 ↓
reboot
 ↓
boot B
```

---

# 45. Trial Boot

Do not immediately declare new firmware permanent.

Use:

```text
ACTIVE
PENDING
CONFIRMED
FAILED
```

Example:

```text
A = confirmed
B = new pending image

reboot
 ↓
boot B
 ↓
application performs self-test
 ↓
application sets B CONFIRMED
```

If B crashes repeatedly:

```text
bootloader detects failed trial
 ↓
rollback to A
```

---

# 46. Phase 19 — Watchdog-Assisted Rollback

Use watchdog reset information and persistent boot metadata.

Possible algorithm:

```text
boot pending image
 ↓
start confirmation timeout
 ↓
application must confirm
 ↓
if watchdog reset before confirm
 ↓
increase boot failure count
 ↓
fallback after threshold
```

---

# 47. Phase 20 — Power-Loss-Safe Metadata

This is one of the most important reliability topics.

Never assume:

```text
write metadata
```

is atomic.

Study:

- torn writes,
- redundant copies,
- sequence counters,
- CRC-protected metadata,
- append-only records,
- transactional state updates.

Example:

```text
metadata copy 0
metadata copy 1
```

Each record:

```text
magic
sequence
state
CRC
```

Select the newest valid copy.

---

# 48. Power-Failure Testing

Deliberately remove power during:

1. erase,
2. program,
3. metadata update,
4. final verification,
5. slot activation.

After every failure the board should remain recoverable.

---

# 49. Phase 21 — External MCU Boot / Update Host

Only begin this after the normal bootloader works.

Possible architecture:

```text
ATmega328P
     │
     ├── reset control
     │
     ├── boot mode control
     │
     └── serial firmware stream
     │
     ▼
RP2350
```

Study RP2350 UART boot mode.

Important RP2350 UART boot characteristics documented by Raspberry Pi include:

- intended for bootstrapping from a simple host,
- fixed UART boot protocol,
- special boot-pin selection,
- QSPI-related pins,
- suitable for specialized board architectures.

Because Pico 2 W already uses external QSPI flash, treat this stage as an architectural experiment rather than the first implementation path.

---

# 50. External MCU Exercise

Possible experiment:

```text
PC
 ↓
ATmega
 ↓
RP2350 custom UART update protocol
```

The ATmega acts as:

```text
firmware gateway
reset controller
health monitor
```

This is more practical on Pico hardware than attempting to repurpose the RP2350 ROM UART boot pins on the existing board.

---

# 51. Phase 22 — Cryptographic Hashing

Replace or supplement CRC with SHA-256.

Understand:

```text
CRC
```

protects against accidental corruption.

```text
SHA-256
```

provides a cryptographic digest but does not alone establish identity.

Use RP2350 hardware SHA support later.

---

# 52. Phase 23 — Digital Signatures

Goal:

Only firmware authorized by the developer should run.

Concept:

```text
firmware
   ↓
SHA-256
   ↓
digest
   ↓
verify signature using public key
   ↓
valid?
```

Private key:

```text
kept OFF DEVICE
```

Public key:

```text
stored / trusted by device
```

---

# 53. Secure Boot Threat Model

Before implementing secure boot, explicitly define threats.

Examples:

- corrupted firmware,
- malicious firmware update,
- downgrade attack,
- flash replacement,
- debug access,
- physical attacker,
- key extraction,
- rollback attack.

Do not treat "encryption" and "authentication" as synonyms.

---

# 54. Phase 24 — RP2350 Secure Boot and OTP

Only after custom signature verification is understood, study RP2350 mechanisms:

- signed boot,
- OTP,
- key hashes,
- secure boot configuration,
- anti-rollback,
- partition permissions,
- debug restrictions,
- secure/non-secure execution.

Use a sacrificial development board for irreversible OTP experiments.

Never program irreversible OTP settings without:

1. reading official documentation,
2. backing up required keys,
3. documenting recovery implications,
4. verifying generated configuration.

---

# 55. Phase 25 — Encrypted Bootloader Example

Study Raspberry Pi's official:

```text
pico-examples/bootloaders/encrypted
```

Do not copy immediately.

Trace:

```text
build
 ↓
keys
 ↓
image generation
 ↓
OTP
 ↓
bootloader
 ↓
decryption
 ↓
image verification
 ↓
image chaining
```

Explain which protections are provided and which are not.

---

# 56. Phase 26 — Wi-Fi OTA Update

Only now introduce Pico 2 W networking.

Architecture:

```text
        update server
              │
            HTTPS
              │
              ▼
         application
              │
        firmware image
              │
              ▼
       inactive slot
              │
              ▼
           reboot
              │
              ▼
          bootloader
              │
       verify signature
              │
       trial boot image
```

Prefer application-managed download and bootloader-managed image selection.

Keep bootloader networking complexity minimal unless there is a strong reason otherwise.

---

# 57. OTA Requirements

Eventually support:

- version checks,
- hardware compatibility,
- signed manifest,
- signed firmware,
- download resume if useful,
- inactive-slot update,
- hash verification,
- reboot,
- trial boot,
- application confirmation,
- rollback.

---

# 58. Phase 27 — Optional Hazard3 RISC-V Study

Only after the Arm bootloader is working.

Compare:

```text
Cortex-M33
vs
Hazard3 RISC-V
```

Study:

- registers,
- privilege,
- CSR model,
- trap handling,
- interrupt model,
- calling convention,
- startup code,
- linker differences.

Compile the same simple application for both architectures and compare disassembly.

---

# 59. Optional Universal Binary Study

Study Raspberry Pi universal examples.

Understand the distinction between:

```text
Universal Binary
```

and

```text
Universal UF2
```

Explore how RP2350 boot metadata can select compatible Arm/RISC-V images.

---

# 60. Debugging Curriculum

Debugging is a first-class project goal.

The learner must become comfortable with:

```text
OpenOCD
GDB
SWD
UART logging
logic analyzer
map files
objdump
readelf
```

---

# 61. GDB Skills Required

Practice:

```gdb
break main
break Reset_Handler
continue
step
next
stepi
info registers
x/16wx ADDRESS
disassemble
bt
set $pc = ...
```

Also learn:

- breakpoints,
- hardware breakpoints,
- watchpoints,
- memory examination,
- register modification,
- assembly stepping.

---

# 62. Boot Debugging Exercise

Set a breakpoint at the earliest debuggable startup point.

Observe:

```text
SP
PC
LR
xPSR
VTOR
```

Step until `main()`.

Record how each changes.

---

# 63. Debugging Broken Startup Code

Intentionally break:

```text
.data copy
.bss zeroing
stack setup
vector location
```

Observe resulting failures.

This is more educational than only running correct code.

---

# 64. Logic Analyzer Skills

Use a logic analyzer to inspect:

```text
UART
SPI
GPIO timing
reset signal
boot handshake
```

Correlate:

```text
source code
 ↓
CPU execution
 ↓
peripheral register
 ↓
electrical signal
```

---

# 65. Repository Layout

Recommended repository:

```text
rp2350-bootloader-learning/
│
├── README.md
│
├── docs/
│   ├── architecture.md
│   ├── memory-map.md
│   ├── boot-sequence.md
│   ├── flash-layout.md
│   ├── uart-protocol.md
│   ├── failure-modes.md
│   └── learning-notes.md
│
├── experiments/
│   ├── 01_gpio/
│   ├── 02_uart/
│   ├── 03_interrupt/
│   ├── 04_startup/
│   ├── 05_linker/
│   └── 06_flash/
│
├── bootloader/
│   ├── src/
│   ├── include/
│   ├── linker/
│   └── CMakeLists.txt
│
├── application_a/
│   ├── src/
│   ├── linker/
│   └── CMakeLists.txt
│
├── application_b/
│   ├── src/
│   ├── linker/
│   └── CMakeLists.txt
│
├── host_tool/
│   ├── updater.py
│   └── requirements.txt
│
├── scripts/
│   ├── inspect_elf.sh
│   ├── flash.sh
│   └── debug.sh
│
└── tests/
```

---

# 66. Documentation Required During the Project

Maintain these documents.

## `architecture.md`

Explain:

```text
RP2350 boot ROM
custom bootloader
application
flash
SRAM
update host
```

## `memory-map.md`

Track exact addresses used.

## `boot-sequence.md`

Document every boot stage.

## `flash-layout.md`

Document partition sizes and boundaries.

## `uart-protocol.md`

Keep protocol authoritative and versioned.

## `failure-modes.md`

Record bugs and what caused them.

## `learning-notes.md`

Record important architectural concepts.

---

# 67. Coding Rules

Bootloader code should initially avoid unnecessary dynamic behavior.

Prefer:

- fixed-size buffers,
- explicit ownership,
- bounded loops,
- checked return values,
- typed enums,
- simple state machines,
- deterministic behavior.

Avoid early use of:

- exceptions,
- RTTI,
- large STL containers,
- hidden allocation,
- complex inheritance,
- threads.

This is not because C++ is unsuitable.

The goal is to keep the runtime footprint understandable.

---

# 68. C++ Features Worth Using

Useful features include:

- namespaces,
- `enum class`,
- `constexpr`,
- templates where they reduce repetition,
- RAII where hardware lifetime semantics are clear,
- strong types,
- `std::array`,
- type-safe register wrappers later.

But always inspect generated code.

---

# 69. Important C++ Questions

During project development, study:

- what happens before `main()`?
- where do global constructors live?
- what is static initialization?
- what is zero initialization?
- where does `new` get memory?
- what happens without a heap?
- what does `volatile` guarantee?
- when are memory barriers required?
- what is placement new?
- what runtime support does C++ require?
- what are ABI calling conventions?

---

# 70. Recommended Learning Milestones

## Milestone M0

Bare-metal AVR register refresher complete.

Proof:

- GPIO,
- timer ISR,
- UART,
- disassembly.

---

## Milestone M1

RP2350 SDK application runs and can be debugged using SWD.

Proof:

- breakpoint in `main`,
- inspect registers,
- modify GPIO from debugger.

---

## Milestone M2

Learner can explain the RP2350 memory map and boot path.

Proof:

Draw from memory:

```text
reset → ROM → flash/image → startup → main
```

---

## Milestone M3

Learner can inspect ELF and linker map files.

Proof:

Find:

- `Reset_Handler`,
- `main`,
- vector table,
- `.data`,
- `.bss`,
- stack,
- constructor table.

---

## Milestone M4

Custom startup experiment works.

Proof:

- initialize `.data`,
- zero `.bss`,
- call `main`.

---

## Milestone M5

Custom linker layout works.

Proof:

Application linked at a deliberately selected region and verified through ELF tools.

---

## Milestone M6

Custom bootloader boots application.

Proof:

```text
ROM → bootloader → application → main
```

Observed in GDB.

---

## Milestone M7

Bootloader rejects corrupted application.

Proof:

Intentionally modify bytes.

Expected:

```text
validation fails
recovery mode entered
```

---

## Milestone M8

UART updater works.

Proof:

PC sends firmware and board boots new version.

---

## Milestone M9

A/B update works.

Proof:

Update inactive slot and switch safely.

---

## Milestone M10

Rollback works.

Proof:

New firmware intentionally fails and bootloader returns to previous confirmed image.

---

## Milestone M11

Power-loss recovery works.

Proof:

Remove power at multiple points during update.

Board must remain recoverable.

---

## Milestone M12

External MCU update host works.

Proof:

Second MCU can control reset/update workflow.

---

## Milestone M13

Signed firmware works.

Proof:

Modified firmware fails signature verification.

---

## Milestone M14

OTA update works.

Proof:

Pico 2 W downloads a signed image into inactive slot and safely updates.

---

# 71. Codex Interaction Protocol

Codex should not dump the entire implementation at once.

For each milestone use:

```text
1. Explain concept
2. Ask learner to predict behavior
3. Show relevant datasheet section
4. Create smallest experiment
5. Build
6. inspect ELF/disassembly
7. run on hardware
8. debug
9. intentionally break something
10. explain failure
11. summarize
12. move forward
```

---

# 72. How Codex Should Explain Code

Whenever providing register-level code, include:

```text
Register name
Address / source of address
Bit field
Why the bit is changed
Expected hardware effect
How to observe the effect
```

Do not say merely:

> This sets the GPIO.

Instead explain the actual hardware path.

---

# 73. How Codex Should Use the Datasheet

When introducing hardware:

1. cite the exact datasheet chapter/section,
2. identify the relevant block diagram,
3. identify registers,
4. derive configuration,
5. then write code.

Do not reverse the order unless doing a quick exploratory experiment.

---

# 74. Questions Codex Should Frequently Ask

Examples:

### Architecture

- What executes immediately after reset?
- What memory contains those instructions?
- Is that memory writable?
- Why does the boot ROM exist?

### Linker

- Who chooses the address of `main()`?
- Can the compiler choose it?
- Why does the application need a different linker layout under a bootloader?

### Interrupts

- Where does the CPU get an ISR address?
- What happens if VTOR points to the bootloader while the application runs?

### Flash

- Why is erase necessary?
- Why can flash writing interfere with execute-in-place?

### Update

- What happens if power fails after erase but before program?
- How can the device know whether a slot is valid?

### Security

- Why is CRC insufficient against an attacker?
- Why must the private key stay off-device?

---

# 75. Failure-First Exercises

At each stage create at least one controlled failure.

Examples:

```text
wrong linker address
wrong stack pointer
wrong vector table
corrupt firmware
UART CRC error
flash write interruption
bad metadata
watchdog timeout
unsigned firmware
rollback attempt
```

The learner should diagnose failures from evidence.

---

# 76. First Practical Project Sequence

The recommended order is:

```text
1. AVR register refresher
2. Pico SDK setup
3. SWD + GDB
4. RP2350 GPIO
5. Cortex-M33 architecture
6. ELF inspection
7. startup code
8. linker script
9. flash/XIP
10. boot ROM
11. custom bootloader
12. application handoff
13. CRC
14. UART update
15. A/B firmware
16. rollback
17. power-loss robustness
18. external MCU host
19. SHA/signatures
20. RP2350 secure boot
21. Wi-Fi OTA
22. optional RISC-V comparison
```

Do not skip steps 3, 6, 7, 8, or 10.

---

# 77. Initial Bootloader Scope

Version 0 should do only:

```text
UART log
 ↓
locate application
 ↓
basic validity check
 ↓
boot application
```

Version 1:

```text
CRC
```

Version 2:

```text
UART update
```

Version 3:

```text
A/B
```

Version 4:

```text
power-failure safe
```

Version 5:

```text
cryptographic authentication
```

Version 6:

```text
OTA
```

---

# 78. Architecture Evolution

## V0

```text
ROM
 ↓
bootloader
 ↓
application
```

## V1

```text
ROM
 ↓
bootloader
 ├── validate
 └── application
```

## V2

```text
             UART host
                 │
ROM              │
 ↓               ▼
bootloader → flash update
 ↓
application
```

## V3

```text
ROM
 ↓
bootloader
 ├── slot A
 └── slot B
```

## V4

```text
ROM
 ↓
bootloader
 ├── metadata redundancy
 ├── trial boot
 ├── watchdog
 └── rollback
```

## V5

```text
ROM
 ↓
bootloader
 ├── SHA-256
 ├── signature verify
 ├── anti-rollback policy
 └── authenticated image
```

## V6

```text
network
   ↓
application downloader
   ↓
inactive slot
   ↓
bootloader validation
   ↓
trial boot
```

---

# 79. Definition of "Deep Understanding"

The project is successful only if the learner can answer questions such as:

### Reset

What physically causes the Cortex-M33 to begin executing a specific instruction after reset?

### Stack

How does the first valid stack pointer get established?

### Linker

How does a C++ function end up at a specific flash address?

### `.data`

How can a writable initialized global live in RAM even though its initial value comes from flash?

### `.bss`

Why can a 100 KB zero-initialized array take almost no space in the firmware file?

### Interrupts

How does an interrupt number become a function call?

### Flash

What prevents arbitrary overwrite of QSPI flash?

### XIP

How does the CPU execute instructions from an external serial flash device?

### Bootloader

How does control safely move from bootloader to application?

### Firmware update

How can the device survive power loss during update?

### Security

How can the bootloader distinguish:

```text
firmware written by us
```

from:

```text
firmware written by an attacker
```

---

# 80. Suggested First Codex Session

Start with:

> We are beginning Phase 0 of the RP2350 bootloader learning project.  
> Do not implement the bootloader yet.  
> First assess my current understanding of MCU reset, registers, memory, interrupts, and compilation using 10-15 technical questions.  
> Then create the smallest ATmega328P register-level refresher exercise that requires GPIO, timer interrupt, and UART without Arduino APIs.  
> Explain the architecture before giving code.

---

# 81. Suggested Second Codex Session

After AVR refresher:

> Begin the RP2350 environment setup.  
> Create a minimal Pico 2 W Cortex-M33 project using the official Pico SDK.  
> Configure it for SWD debugging through the Raspberry Pi Debug Probe.  
> Explain every tool involved: compiler, linker, ELF, OpenOCD, GDB, UF2, and picotool.  
> Then build Blink and show me how to stop at `main()` and inspect PC, SP, LR, and xPSR.

---

# 82. Suggested ELF Session

> Take the generated Pico ELF and teach me how to reverse-engineer its layout using `readelf`, `objdump`, `nm`, and the linker map.  
> I should identify the reset handler, vector table, `main`, `.text`, `.rodata`, `.data`, `.bss`, stack-related symbols, and C++ constructor data before continuing.

---

# 83. Suggested Startup Session

> Now remove as much runtime abstraction as practical and teach me startup execution.  
> I want to understand every instruction between reset and `main()`.  
> Build a minimal startup experiment, inspect its assembly, and demonstrate `.data` copy, `.bss` clearing, vector-table setup, stack initialization, and C++ constructor invocation.

---

# 84. Suggested Bootloader Session

Only after previous stages:

> We are ready for the first custom RP2350 bootloader.  
> Implement only the minimal boot chain: boot ROM → custom bootloader → separately linked application.  
> Do not add firmware update yet.  
> First design and document the flash/partition layout using official RP2350 boot-image requirements.  
> Then implement application validation and handoff.  
> We must prove the transition using GDB.

---

# 85. Suggested Firmware Update Session

> Extend the bootloader with a normal-UART firmware update protocol.  
> First write the protocol specification.  
> Then implement a PC-side sender and bootloader receiver.  
> Include length validation, chunk sequencing, CRC, timeout, retry, flash erase/program/readback verification, and clear error states.

---

# 86. Suggested Reliability Session

> Convert the updater into an A/B firmware system with trial boot, application confirmation, rollback, watchdog integration, and power-loss-safe metadata.  
> Before coding, create a failure-state table enumerating every point at which reset or power loss can occur and what state the bootloader should recover into.

---

# 87. Suggested Security Session

> Introduce cryptographic firmware authentication.  
> Start by explaining why CRC is insufficient.  
> Then introduce SHA-256 and digital signatures.  
> Implement signature verification before studying RP2350 secure-boot hardware.  
> Do not program irreversible OTP until we explicitly review the consequences.

---

# 88. Important Safety Rule for OTP

Codex must treat RP2350 OTP programming as potentially irreversible.

Before any OTP write:

```text
STOP
 ↓
explain exact OTP field
 ↓
explain permanence
 ↓
explain how it affects future boot
 ↓
explain debug/recovery implications
 ↓
verify user intentionally wants to perform it
```

For learning, prefer simulation, generated configuration review, or a sacrificial board before locking production security settings.

---

# 89. Expected Final Capstone

The final project should ideally support:

```text
Power on
   ↓
RP2350 ROM
   ↓
custom bootloader
   ↓
load redundant boot metadata
   ↓
select confirmed/pending image
   ↓
verify image integrity
   ↓
verify authenticity
   ↓
trial boot if needed
   ↓
application
   ↓
application self-test
   ↓
confirm firmware
```

Firmware update:

```text
Wi-Fi / UART / external host
        ↓
download image
        ↓
inactive slot
        ↓
verify
        ↓
mark pending
        ↓
reboot
        ↓
trial boot
        ↓
confirm or rollback
```

---

# 90. Final Skills Expected

At the end, the learner should have practical knowledge of:

## MCU architecture

- reset,
- registers,
- stack,
- interrupts,
- memory maps,
- buses,
- peripherals.

## Arm Cortex-M

- vector table,
- exception model,
- NVIC,
- MSP/PSP,
- VTOR,
- HardFault debugging.

## C/C++ runtime

- startup,
- `.data`,
- `.bss`,
- constructors,
- ABI basics,
- stack/heap.

## Toolchain

- compiler,
- assembler,
- linker,
- linker scripts,
- ELF,
- BIN,
- UF2,
- map files,
- disassembly.

## RP2350

- boot ROM,
- image/partition model,
- QSPI/QMI,
- XIP,
- SRAM,
- flash,
- UART boot,
- OTP,
- SHA hardware,
- security features.

## Firmware engineering

- bootloaders,
- firmware headers,
- update protocols,
- CRC,
- watchdog,
- A/B firmware,
- rollback,
- power-loss safety.

## Security

- hashing,
- signatures,
- key management,
- secure boot,
- anti-rollback,
- OTP implications.

## Debugging

- SWD,
- GDB,
- OpenOCD,
- logic analyzer,
- register inspection,
- disassembly,
- fault diagnosis.

---

# 91. Final Rule for Codex

Do not let this project become:

```text
copy example
 ↓
compile
 ↓
flash
 ↓
works
 ↓
done
```

The required model is:

```text
understand
 ↓
predict
 ↓
implement
 ↓
inspect
 ↓
measure
 ↓
break
 ↓
debug
 ↓
explain
 ↓
improve
```

The objective is not just a custom bootloader.

The objective is to make the learner capable of approaching an unfamiliar MCU datasheet and eventually designing a boot architecture independently.

---

# 92. Start Here

Codex should begin by saying:

> We will not write the RP2350 bootloader yet.  
> First we will establish the architectural foundations needed to understand it.  
> I will assess your current knowledge, then we will work through each milestone using theory, datasheet references, hardware experiments, ELF/disassembly inspection, and debugging.  
> The first goal is to rebuild your register-level microcontroller intuition and then move into Cortex-M33 reset/startup behavior.

Then begin **Phase 0**.
