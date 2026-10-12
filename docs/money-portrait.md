# Анимация лица в денежной теме

Текущий [GIF](../assets/img/face-money.gif): только голова Артёма на прозрачном
фоне, большие белые глаза со знаками доллара вместо зрачков, открытый рот и
высунутый язык. Выражение создано по пользовательскому референсу Скруджа Макдака.

Двигаются само лицо, язык и мимика; глаза моргают. 48 кадров, 20 кадров/с,
цикл 2,4 секунды. [Неподвижный кадр](../assets/img/face-money-still.png)
показывается при уменьшении движения и в скрытой вкладке.

Исходники созданы встроенным imagegen, без CLI:

- [Основной портрет](../assets/img/face-money-scrooge.png).
- [Кадр моргания](../assets/img/face-money-scrooge-blink.png).

Исходное лицо: `assets/img/face.png`. Референс выражения: пользовательское
изображение `20608-1000x830.jpg`.

Сборка: `python tools/render-money-gif.py`. Браузер анимирует портрет как
непрерывную поверхность: слегка двигает язык, мимику и голову. Моргание
использует второй сгенерированный кадр в области глаз. FFmpeg кодирует кадры в GIF.

## Промпт основного портрета

```text
Use case: identity-preserve, reference-guided expression edit.
Asset type: isolated portrait of the user for an animated GIF, transparent cutout, only his human head.
Input image 1: identity reference and edit target, the real young man's original face. Preserve this man's identity, hairstyle, hair color, head outline, ears, nose, jaw, skin tone and recognizable human facial features.
Input image 2: expression reference only, Scrooge McDuck's greedy delighted face. Transfer the EXPRESSION and visual gag to the man's face: two VERY LARGE tall white cartoon eyes, with bold black DOLLAR SIGNS "$" as the pupils in the centers of BOTH eyes. The eyes are part of his face, not floating decorations. A huge delighted OPEN human mouth with the tongue hanging OUT and DOWN, similar to the reference's ecstatic money reaction. Preserve a human nose and human lips, no duck bill.
Primary request: turn the user's face into the human equivalent of the exact money-eyed tongue-out expression in image 2. The user's photographic face remains recognizable, with professionally integrated exaggerated white eyes and dollar-sign pupils and a very visible tongue-out open-mouth grin. The tall eyes fill the upper face like the reference while maintaining the user's hair, ears and face identity.
Composition: single upright front-facing complete human head, all hair, ears, chin and tongue inside the image. Tight clean head cutout with a small transparent margin. Tall portrait aspect about 439:640, no shoulders or neck.
Style: polished humorous photo-composite portrait, photorealistic human hair and skin combined with clean expressive cartoon money eyes, naturally pink tongue, matching lighting and tidy edges. The eyes should be white ovals with BLACK dollar signs, NOT banknotes sticking out of eye sockets.
Constraints: ONLY THE MAN'S FACE. NO loose money, NO banknotes, NO currency outside the eyes, NO banknote covering the eyes, NO objects floating around him, NO duck, NO beak, NO feathers, NO glasses, NO body, NO clothes, NO blue background, NO scene, NO captions, NO watermark. Genuinely transparent alpha background.
```

## Промпт кадра моргания

```text
Use case: identity-preserve, precise localized facial expression edit.
Asset type: a closed-eye blink keyframe for an animated GIF. The input is the exact open-eye money-face keyframe.
Primary request: change ONLY the two large white dollar-sign eyes to naturally closed eyelids in a happy brief blink. Keep the same eye centers and skin color. The lids gently meet in two curved smiling arcs at the centers of the existing cartoon eyes. There are no dollar signs visible when the eyes are closed.
CRITICAL invariants: preserve the exact person's identity and ALL other pixels as much as possible: head position, image dimensions and framing, outer outline, hairstyle, forehead, raised eyebrow shapes and positions, nose shape and position, ears, cheeks, jaw, wide open smile, teeth, tongue hanging down, lighting and skin texture. Do not move the eyebrows, squeeze the nose or squash the forehead. NO stretching or compression of surrounding facial features; blink changes the eyes and eyelid areas only.
Composition: same complete isolated head, same tall aspect ratio about 439:640, same transparent margin as the source. Genuinely transparent alpha background.
Constraints: only this man's head; no banknotes, no floating currency, no duck, no body, no clothes, no text, no watermark. This is a clean blink frame matched precisely to the input, not a redesigned portrait.
```
