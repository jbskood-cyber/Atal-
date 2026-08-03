# Image Generation Request — e01 Sentadilla asistida

## Shared style lock

Photorealistic clinical exercise-instruction image. Use the same synthetic adult model in both frames: neutral non-identifying appearance, navy short-sleeve athletic shirt, navy/blue shorts, plain shoes, no logos. Cool-white clinical studio, soft diffuse light, realistic anatomy and proportions. Full body and stable horizontal support rail visible. Identical model, clothing, background, equipment, camera, lens, crop, and lighting across frames. No text, arrows, labels, anatomy overlays, pain graphics, watermark, diagnosis, therapist, decorative props, or advertising pose.

## Start frame

Three-quarter side view. Adult standing upright with feet hip-width apart, both heels supported, knees and hips relaxed but extended, trunk controlled, both hands lightly holding a stable horizontal rail at about waist height. Neutral facial expression. Show the complete body, feet, hands, rail, and floor contact.

## End frame

Use the exact same scene and identity. Change only the movement state: controlled shallow assisted squat, hips slightly back, knees flexed and aligned in the direction of the feet, heels fully supported, trunk stable, hands maintaining a light grip without hanging from the rail.

## Negative constraints

No deep forced squat, knee valgus, lifted heels, excessive trunk flexion, unstable furniture, missing/cropped feet or hands, impossible anatomy, different clothing/model/camera, pain expression, extra equipment, text, logos, or watermark.

## Reserved output

- `/exercises/v1/knee/e01/start.webp`
- `/exercises/v1/knee/e01/end.webp`
- target per frame: ≤220 KB after WebP optimization
- status after generation: `draft`
