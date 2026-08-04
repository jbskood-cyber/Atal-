# Image Generation Request — e27 Dead bug con deslizamiento de talón

## Shared style lock

Photorealistic clinical exercise-instruction image. Use the same synthetic adult model in both frames: neutral non-identifying appearance, navy short-sleeve athletic shirt, navy/blue shorts, no logos. Cool-white clinical studio, soft diffuse light, realistic anatomy. Same person, clothing, mat, camera, crop, and lighting across frames. Slightly elevated low three-quarter side view showing shoulders through feet with the lumbopelvic region unobstructed. No text, arrows, labels, anatomy overlays, pain graphics, watermark, diagnosis, therapist, decorative props, or advertising pose.

## Start frame

Adult lying supine on a plain firm clinical mat. Both knees flexed, both feet flat and hip-width apart, arms relaxed beside the body, head and shoulders supported. Pelvis level, trunk neutral, and both heels clearly visible on the mat.

## End frame

Use the exact same scene and identity. Change only the movement state: slide the right heel slowly forward along the mat until the right knee is nearly extended. The right heel remains in contact with the mat. The left foot remains planted, the left knee remains aligned, and the pelvis stays level without rotation or increased lumbar arch.

The start/end difference must remain obvious at thumbnail size because the right leg length and knee angle visibly change. Reject the pair if the movement is not immediately distinguishable without text.

## Negative constraints

No lifted or hovering heel, no straight-leg raise, no bridge or pelvis lift, no pelvic rotation, no exaggerated lumbar arch, no cervical flexion or lifted head, no forceful foot push, no collapse or separation of the supporting knee, no cropped pelvis/feet/shoulders, impossible anatomy, different model/clothing/camera, pain expression, text, logos, or watermark.

## Reserved output

- `/exercises/v1/lumbar/e27/start.webp`
- `/exercises/v1/lumbar/e27/end.webp`
- target per frame: ≤220 KB after WebP optimization
- status after generation: `draft`
