# MEXE Laboratory State Story

> This document describes the behavior of the laboratory.
> It does not define implementation, only the interface narrative and states.

---

# Philosophy

The laboratory does not have screens.

It has states.

Each component reacts to the laboratory's states.

```text
Idle
    ↓
Activated
    ↓
First Sample Loaded
    ↓
Second Sample Loaded
    ↓
Processing
    ↓
Result
```

---

# Components

## Core

The center of the laboratory.

Responsible for representing the overall state of the system.

States:

- Idle
- Activated
- Processing
- Result

---

## CoreSymbol

Represents the "reactor".

It is never a button.

Its purpose is to visually communicate the state of the laboratory.

States:

Idle

- Invisible

Hover

- Appears softly
- Looks engraved into the surface

Activated

- Lights up
- Small mechanical rotation
- Remains active

Processing

- Slow continuous rotation
- Represents the reactor in operation

Result

- Slowly disappears

---

## Aura

Represents the energy field of the core.

Idle

- Very subtle

Activated

- Emerges from the center
- Ignites in magenta
- Stabilizes in blue

Processing

- Slowly breathes

Result

- Reduces intensity

---

## Halo

Represents the immediate light around the core.

Activated

- Expands quickly
- Stabilizes

Processing

- Maintains intensity

---

## SampleAnchor

Responsible only for movement.

It never represents appearance.

Functions:

- Positioning
- Drift
- Entry
- Approach toward the Core
- Disappearance

---

## SampleNode

Represents the sample.

States:

### Pending

- Neutral stone
- Subtle breathing

### Loaded

- Blue
- Cool glow

---

## ReactionField

Represents the reaction space.

Idle

- Almost imperceptible

Activated

- Appears slowly

Processing

- Continuous movement

Result

- Reduces intensity

---

# Flow

## 1. Idle

Laboratory off.

Core

- Hover active

CoreSymbol

- Invisible

Aura

- Almost invisible

Samples

- Do not exist

---

## 2. Activated

The user clicks the Core.

Core

- Boot

Aura

- Rise
- Ignition

CoreSymbol

- Appears
- Lights up

Samples

- Appear

Hover

- Disabled

---

## 3. First Sample Loaded

The user selects the first image.

Sample Left

- Loaded

Sample Right

- Pending

The system waits.

---

## 4. Second Sample Loaded

The user selects the second image.

Both samples:

- Loaded

The system automatically starts processing.

---

## 5. Processing

Samples

- Stop floating
- Move toward the core
- Disappear behind the planet

CoreSymbol

- Slow rotation

Aura

- Continuous breathing

ReactionField

- Active movement

---

## 6. Result

Processing completed.

CoreSymbol

- Disappears

Aura

- Reduces intensity

Image

- Fade In

Panel

- Download
- Reset

---

# Principles

The user never sees a spinner.

The laboratory is the progress indicator.

The Core is always the protagonist.

Samples exist only to feed the core.

Animations must communicate behavior, never decoration.

Every movement must have a reason.

Every visual effect represents a state of the laboratory.
