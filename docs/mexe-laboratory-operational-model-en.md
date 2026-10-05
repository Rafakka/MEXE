# MEXE LABORATORY — OPERATIONAL MODEL

> This document describes how the Laboratory organizes state, operation, context, navigation, and recovery.
>
> It defines the model that operations must follow to participate in the existing workflow without creating a parallel flow.

---

# 1. LABORATORY STATE MODEL

The Laboratory uses different state dimensions to represent distinct aspects of the workflow.

| Field | Answers the question | Example |
|---|---|---|
| `phase` | Where is the Laboratory? | `activated` |
| `operationPhase` | What is the operation doing? | `running` |
| `operation` | Which operation is being executed? | `blend` |
| `mode` | How was the operation started? | `reentry` |

The fundamental distinction is:

```text
phase          = structural location
operationPhase = operational progress
operation      = selected work
mode           = input path
```

These dimensions are not interchangeable.

```text
phase
  └── describes the structural state of the Laboratory

operationPhase
  └── describes the internal state of the operation

operation
  └── identifies the work being executed

mode
  └── identifies the operation's input path
```

### Rule

Frontend components should react only to the state dimensions relevant to their responsibility.

A cross-cutting component can react to `phase` without needing to know `mode`.

A specific operation can react to `operation` and `operationPhase` without modifying the overall Laboratory structure.

---

# 2. OPERATION FLOW

An operation always starts from a user action or input.

There are two main input paths:

```text
                     USER INPUT
                         │
              ┌──────────┴──────────┐
              │                     │
         normal input             reentry
              │                     │
              │                  .mx file
              │                     │
              └──────────┬──────────┘
                         ▼
                  validated data
                         │
                         ▼
                     LabContext
                         │
                         ▼
                     Laboratory
                         │
                         ▼
                   operation flow
```

For `blend`, two images are required.

The flow does not execute the blend immediately after the second selection. File validation allows the Laboratory to advance through its visual and operational workflow until `startOperation()` can start the operation.

Simplified:

```text
Input
  ↓
Validation
  ↓
synchronizing
  ↓
revealing
  ↓
startOperation()
  ↓
processing
  ↓
backend request
  ↓
result / failure
```

Data execution moves **forward within the workflow**. Returning occurs through a result, failure, or explicit recovery mechanisms, rather than through the creation of a reverse execution flow.

---

# 3. LAB CONTEXT

`LabContext` gathers the data required to execute an operation.

Currently:

```ts
type LabContext = {
    operation: LaboratoryOperation;
    mode: LaboratoryMode;
    firstFile: File | null;
    secondFile: File | null;
};
```

Therefore:

```text
LabContext
├── operation
├── mode
├── firstFile
└── secondFile
```

It represents the **operational context**, not a complete copy of the Laboratory state.

The context is created when the data required for the operation is available:

```ts
const labContext = createLabContext(
    operation,
    mode,
    firstFile,
    secondFile
);
```

This context can then be used by controllers to start or retry an operation.

In the `reentry` flow, data persisted in `.mx` is used to reconstruct the files and operation, allowing a new `LabContext` to be formed and execution to resume.

### Rule

```text
LabContext = context required to execute
.mx        = persisted representation of that context
```

They have different responsibilities.

---

# 4. OPERATION CONTROLLER

The Laboratory does not directly execute each operation.

The `labOpController` acts as the entry point for execution:

```text
Laboratory
    │
    ▼
LabContext
    │
    ▼
labOpController
    │
    ├── startOperation()
    │
    └── retryOperation()
```

Normal operation uses `startOperation()`.

Recovery/reentry uses `retryOperation()`.

The input path is determined by `mode`:

```text
mode = stateless
    → manualRetry()

mode = reentry
    → manualReentry()
```

This allows different operations to use the same structural execution mechanism without creating an independent controller for each one.

---

# 5. EXTENSION MODEL

A new `operation` must integrate with the existing Laboratory model.

When adding an operation, the following must be defined:

```text
1. which data it receives
2. which frontend components participate
3. which states it observes
4. how its execution is registered
5. how it participates in recovery
```

The operation must use the existing dimensions:

```text
operation
    → identifies the operation

mode
    → distinguishes the input paths

phase
    → represents the structural position

operationPhase
    → represents operational progress
```

### Example

A future operation:

```text
filter
```

could share the existing Laboratory structure while having its own components and stages.

The goal is not to create:

```text
Blend Laboratory
Resize Laboratory
Filter Laboratory
```

The goal is to maintain:

```text
                  Laboratory
                     │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
       blend        resize       filter
```

The new operation adapts to the existing workflow.

> **A new `operation` must adapt to the Laboratory model rather than create a new execution model.**

---

# 6. PROCESS REGISTRY

Operation execution is connected to the Laboratory through the `processRegistry`.

Currently, `blend` is registered as a handler:

```ts
registerProcess(
    "blend",
    async (firstFile, secondFile) => {
        await dispatch(
            performMerge(firstFile, secondFile)
        );
    }
);
```

Conceptually:

```text
operation
    │
    ▼
processRegistry
    │
    ▼
ProcessHandler
    │
    ▼
backend operation
```

This allows recovery to look up the handler for an interrupted operation without needing to know the specific implementation of each operation.

---

# 7. NAVIGATION

Laboratory navigation is deliberately concise.

The principle is:

```text
advance → workflow
back     → explicit user intent
reset    → new cycle
```

`Back` has a specific role: allowing the user to abandon the flow **before its execution has effectively advanced into operation processing**.

Once the flow has left this context, `Back` is not used to undo processing.

`Reset` represents the beginning of a new Laboratory cycle.

Conceptually:

```text
User
 │
 ▼
Laboratory
 │
 ├── Back ──→ abandon current context
 │
 ▼
Operation
 │
 ├── success
 │
 └── failure
       │
       ▼
     Reset
       │
       ▼
     Idle
```

### Rule

```text
Back  = abandon the current context
Reset = start a new cycle
```

This keeps navigation predictable and prevents `Back` from becoming an operational rollback mechanism.

---

# 8. RESILIENCE MODEL

Resilience uses two different structures:

```text
LabContext
    → data required to execute/reconstruct

resilienceMemory
    → minimum required to identify and resume the process
```

Resilience memory records:

```ts
type RecoveryProcess = {
    type: LaboratoryOperation;
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
};
```

In other words:

```text
RecoveryProcess
├── type
├── phase
└── operationPhase
```

It does not need to store the entire Laboratory state.

Its purpose is to preserve the **minimum required to recognize the interrupted process and reconstruct its execution**.

---

# 9. RECOVERY FLOW

Before process execution, memory records the process being executed.

If communication with the backend fails:

```text
running
   │
   ▼
reconnecting
   │
   ├───────────────┐
   │               │
   ▼               ▼
recovered        offline
   │               │
   ▼               ├── retry
restore state      ├── reset
                   └── save .mx
```

Recovery distinguishes three situations:

### Automatic Recovery

The system attempts to restore communication and continue the operation.

### Manual Recovery

The user can request another attempt.

### Persistence

When the operation cannot continue at that moment, the required data can be preserved in a `.mx` session for later `reentry`.

Thus:

```text
                 FAILURE
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       automatic  manual     .mx
         retry     retry     session
          │         │         │
          └─────────┴────┬────┘
                         ▼
                       resume
```

### Rule

> **Resilience preserves the minimum required to continue the flow, not a complete copy of the Laboratory state.**

---

# 10. OVERVIEW

The entire model can be reduced to this sequence:

```text
                         USER
                          │
                          ▼
                    ┌───────────┐
                    │   Input   │
                    └─────┬─────┘
                          │
                ┌─────────┴─────────┐
                │                   │
             normal              reentry
                │                  .mx
                └─────────┬─────────┘
                          ▼
                    ┌───────────┐
                    │ Validation│
                    └─────┬─────┘
                          ▼
                    ┌───────────┐
                    │ LabContext│
                    └─────┬─────┘
                          ▼
                 ┌──────────────────┐
                 │  Operation Flow  │
                 └────────┬─────────┘
                          ▼
                  ┌───────────────┐
                  │ProcessRegistry│
                  └───────┬───────┘
                          ▼
                       Backend
                          │
                    ┌─────┴─────┐
                    │           │
                 success      failure
                    │           │
                    ▼           ▼
                 result      recovery
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  retry      manual        .mx
                    │           │           │
                    └───────────┴─────┬─────┘
                                      ▼
                                    reentry
```

## The model in one sentence

> **The user starts an operation, the Laboratory drives its workflow through explicit states, `LabContext` gathers the context required to execute it, the registry connects the operation to execution, and the resilience layer preserves only what is necessary to recover it.**
