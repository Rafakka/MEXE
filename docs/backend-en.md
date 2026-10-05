# Backend

## Architecture

The request arrives through the API interface and is forwarded to the `ImageProcessingService`, responsible for coordinating the processing.

The operation is prepared by the `ImagePreparationService`, which first validates the input files through the `InputValidator`. After validation, the data is read into memory, decoded by the `ImageDecoder`, and normalized by the `NormalizeProcessor`.

Once the images are prepared, the operation is executed by the corresponding processor — currently, the `BlendProcessor`.

The result is then sent to the `ImageEncoder`, which transforms it into the response representation returned by the API.

---

## API Contract

The backend exposes an HTTP interface for image processing.

### Stateless Processing

Stateless input uses the `/blend` endpoint and requires:

- `implicit_image_a`
- `implicit_image_b`
- `width`
- `height`

Both images are received as uploads and processed in memory.

### Reentry

Reentry input uses the `/reentry` endpoint and receives a reentry file.

The backend validates the file, retrieves the stored operation, and forwards the operation through the same processing pipeline.

### Supported Images

Accepted image formats are defined by `SUPPORTED_IMAGE_TYPES`.

### Response

The current processing response is the resulting image in PNG format.

### Endpoints

#### `/blend`

Receives two images, normalizes both to the requested size, and executes the blend operation, returning the resulting image.

#### `/reentry`

Receives a reentry file, validates its contents, retrieves the operation, and forwards it through the processing pipeline.

#### `/health`

Exposes the current operational status of the service.

#### `/ready`

Indicates whether the service is ready to process requests.

#### `/metrics`

Exposes the application's observability metrics.

---

## Resilience

MEXE's resilience is oriented toward operational continuity.

When an operation is in progress and communication with the backend is interrupted, the laboratory does not immediately discard the current work.

The frontend maintains the context required to recover the operation, while the resilience memory records the minimum state required to identify the interrupted process.

### Recovery

The recovery flow is:

```text
Processing
    ↓
Backend unavailable
    ↓
Reconnecting
    ↓
Recovery attempt
    ↓
 ┌───────────────┐
 │               │
Success       Failure
 │               │
 ↓               ↓
Result         Offline
                 │
          ┌──────┼──────┐
          ↓      ↓      ↓
       Retry    Save   Reset
               session
```

During recovery, the operation context remains available so that the operation can be executed again.

The operation controller uses this context to perform either a manual retry or a reentry, depending on the operation mode.

### Preserved State

The operational context contains:

- selected operation;
- operation mode;
- first image;
- second image.

The resilience memory maintains only the minimum state of the interrupted process:

- `type`;
- `phase`;
- `operationPhase`.

This separation prevents the recovery memory from needing to know the entire structure of the laboratory.

### Options After Failure

When automatic recovery cannot restore processing, the laboratory enters `offline`.

In this state, the user has three options.

#### 1. Try Again

The user can manually request another attempt to execute the operation.

The retry uses the preserved context and can perform either a normal retry or a reentry, depending on the operation mode.

#### 2. Save the Session

The user can save the current work as a reentry session.

The session is generated from the two images maintained by the laboratory context and made available for download.

This allows the user to leave the current connection without losing the work.

#### 3. Reset the Laboratory

The user can discard the current state and return to the normal flow.

The reset clears the images maintained by the frontend and restarts the corresponding process.
