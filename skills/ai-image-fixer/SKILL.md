---
name: ai-image-fixer
description: "Remove AI-generated metadata (EXIF, XMP, IPTC, C2PA) from images so they won't be labeled as 'Made with AI' when uploaded to platforms like X/Twitter, Instagram, or Facebook. Use this skill whenever the user types '/fix' with an uploaded image, or when they ask to remove AI metadata, clean image metadata, strip AI labels, remove 'Made with AI' tag, or make an AI-generated image look natural for social media posting."
---

# AI Image Metadata Remover

This skill removes all AI-related metadata from images and prepares them for upload to social media platforms without triggering "Made with AI" labels.

## When to Trigger

- User uploads an image and types `/fix`
- User asks to remove AI metadata from an image
- User mentions "Made with AI" label and wants it removed
- User wants to clean/strip image metadata for social media

## Workflow

### Step 1: Locate the Uploaded Image

Find the user's uploaded image in the `/home/z/my-project/upload/` directory. Look for the most recently uploaded image file (PNG, JPG, JPEG, WEBP, GIF, BMP).

### Step 2: Analyze the Image Metadata

Run the analysis script to detect all metadata in the image:

```bash
python3 /home/z/my-project/skills/ai-image-fixer/scripts/analyze_metadata.py "<image_path>"
```

Report the findings to the user — which AI metadata markers were found (e.g., "Made with Google AI", "trainedAlgorithmicMedia", C2PA credentials, etc.).

### Step 3: Clean the Image

Run the cleaning script to remove all metadata and apply subtle modifications:

```bash
python3 /home/z/my-project/skills/ai-image-fixer/scripts/fix_image.py "<input_image_path>" "<output_image_path>"
```

The output path should be: `/home/z/my-project/download/fixed_<original_filename>`

This script will:
1. Strip ALL metadata (EXIF, XMP, IPTC, C2PA, PNG text chunks)
2. Add subtle gaussian noise to avoid AI-detection algorithms
3. Apply slight sharpening to maintain visual quality
4. Apply minimal contrast adjustment for a more natural look
5. Save the image as a clean file with zero metadata

### Step 4: Verify the Clean Image

Run the analysis script on the output to confirm all metadata is removed:

```bash
python3 /home/z/my-project/skills/ai-image-fixer/scripts/analyze_metadata.py "<output_image_path>"
```

Confirm to the user that the image is clean.

### Step 5: Display Download Page

Build a simple frontend download page using the fullstack-dev skill workflow. The page should:

1. Copy the fixed image to `/home/z/my-project/public/images/`
2. Create an API route at `/api/download/route.ts` that serves the image file
3. Update `src/app/page.tsx` with a clean download page that includes:
   - Image preview
   - Status badges showing what was removed (EXIF, XMP, IPTC, AI Metadata)
   - Download button(s) for the fixed image
   - File size information
   - A note that the image is ready for social media upload

The API route should:
- Accept a `file` query parameter
- Only allow files from the `public/images/` directory
- Serve the file with proper `Content-Disposition: attachment` header

### Step 6: Provide the Preview Link

Give the user the preview link in this format:
```
https://preview-chat-<chatid>.space.z.ai/
```

Replace `<chatid>` with the actual chat ID from the IM gateway metadata.

## Output Formats

The script will generate two output files:
- **JPEG version** (compressed, smaller ~500KB) — recommended for social media
- **PNG version** (lossless, larger) — for maximum quality preservation

Both formats will have all metadata stripped.

## Important Notes

- Always process the image through the Python scripts — do not try to manually edit metadata
- The subtle noise and adjustments are crucial for bypassing platform AI-detection beyond just metadata checking
- Platforms like X/Twitter use both metadata scanning AND visual AI detection, so both need to be addressed
- If the original image is very large (>5MB), recommend the JPEG version for social media uploads
- Save all processed files to `/home/z/my-project/download/`
