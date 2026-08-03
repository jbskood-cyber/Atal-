# Image Generation Request — e14 Rotación externa con banda

## Shared style lock

Photorealistic clinical exercise-instruction image. Use the same synthetic adult model in both frames: neutral non-identifying appearance, navy short-sleeve athletic shirt, navy/blue shorts, no logos. Cool-white clinical studio, soft diffuse light, realistic anatomy. Identical person, clothing, background, band, anchor, camera, crop, and lighting across frames. Three-quarter frontal view from the working side; head to hips, both hands, elbow, band, and secure anchor fully visible. No text, arrows, labels, anatomy overlays, pain graphics, watermark, diagnosis, therapist, decorative medical props, or advertising pose.

## Start frame

Adult standing upright with relaxed shoulders and stable trunk. Right elbow flexed approximately 90 degrees and kept close to the torso. Right forearm rests in front of the abdomen, wrist neutral, hand holding a smooth elastic band. Band is securely anchored at right-hand height and carries light tension.

## End frame

Use the exact same scene and identity. Change only the movement state: right forearm rotated outward in a controlled range against the band while the elbow remains close to the torso, shoulder stays down, wrist remains neutral, and trunk/pelvis do not rotate.

## Negative constraints

No elbow drifting away from the torso, shoulder shrug, trunk rotation, wrist extension/deviation, unstable anchor, excessive band tension, cropped anchor/hand/elbow, impossible anatomy, different model/clothing/camera, pain expression, text, logos, or watermark.

## Reserved output

- `/exercises/v1/shoulder/e14/start.webp`
- `/exercises/v1/shoulder/e14/end.webp`
- target per frame: ≤220 KB after WebP optimization
- status after generation: `draft`
