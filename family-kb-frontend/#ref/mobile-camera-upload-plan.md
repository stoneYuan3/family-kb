# Mobile Camera Upload Plan

## Context

The primary user flow is: take a photo of a document on a phone → upload it. The current file input opens the standard OS picker, which works but doesn't prioritize the camera. We want a dedicated "Take Photo" option that opens the camera directly, plus a separate "Choose File" option for gallery/PDF uploads.

## How It Works

The HTML `capture` attribute on `<input type="file">` controls this behavior:

- `accept="image/*" capture="environment"` → opens the **camera directly** (rear camera)
- `accept="image/*"` (no `capture`) → opens the standard **file picker** (camera + gallery + files)

You can't combine both behaviors in a single input — `capture` forces camera-only. So the solution is **two hidden inputs triggered by two buttons**.

## Changes

### Files to modify

- `app/dashboard/files/[id]/page.tsx` — item detail edit mode upload zone
- `app/dashboard/files/create/page.tsx` — create item upload zone

### Implementation

**1. Add a second ref** for the camera input:

```tsx
const cameraInputRef = useRef<HTMLInputElement>(null);
```

**2. Replace the single upload zone** with two buttons inside the dashed border area:

```tsx
{editing && (
    <div className="mt-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Add more documents</p>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                >
                    Take Photo
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Choose File
                </Button>
            </div>
        </div>
        {/* Camera input — opens camera directly on mobile */}
        <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
        />
        {/* File picker — opens gallery/files on mobile, file browser on desktop */}
        <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
        />
        {/* Pending file list (unchanged) */}
    </div>
)}
```

### Key Details

- `capture="environment"` opens the **rear camera**. Use `"user"` for front camera if preferred.
- Camera input is **not** `multiple` — you take one photo at a time.
- File picker input keeps `multiple` for batch uploads from gallery.
- Both inputs use the same `handleFileChange` handler (already handles appending to `newFiles`).
- On desktop, both buttons open the normal file dialog — browsers ignore `capture` on non-mobile devices.

## Verification

1. **Phone — Take Photo**: tap "Take Photo" → camera should open immediately
2. **Phone — Choose File**: tap "Choose File" → standard picker with gallery/files options
3. **Desktop**: both buttons open the file dialog (`capture` is ignored)
4. Files from either button appear in the pending list and upload correctly on Save
