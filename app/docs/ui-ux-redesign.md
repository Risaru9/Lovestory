# LoveStory UI/UX Redesign

## Arah Desain

Tema retro 8-bit tetap dipertahankan sebagai identitas utama. Redesign diarahkan ke gaya "premium pixel romance": gelap, lembut, romantis, namun tetap praktis untuk aplikasi mobile satu tangan.

Masalah utama desain lama:
- Banyak layar memakai visual RPG desktop sehingga beberapa target sentuh terlalu kecil.
- Warna pink, kuning, cyan, dan panel gelap dipakai berulang tetapi belum menjadi token konsisten.
- Beberapa copy/icon tampil rusak karena encoding.
- Hierarki halaman kadang terlalu ramai: header, card, CTA, dan instruksi bersaing.
- Radius, shadow, input, modal, dan button belum sepenuhnya konsisten.
- Safe area mobile dan aksesibilitas focus/contrast belum merata.

Perubahan utama:
- Menambah design token global di `src/index.css`.
- Memperbarui `PixelButton` menjadi target sentuh 44-52px, focus ring, radius 8px, dan shadow pixel konsisten.
- Mengubah landing/splash, login/register, dan couple pairing menjadi flow mobile-first.
- Menambahkan tiga konsep logo pixel love di `public/images/logo`.

## Design System

Color palette:
- Ink: `#05050A`
- Night: `#0C0A18`
- Panel: `#141427`
- Panel Soft: `#1C1B33`
- Primary Pink: `#FF5FAE`
- Hot Pink: `#FF2F93`
- Soft Pink: `#FFB8D2`
- Gold: `#FFD166`
- Cyan: `#5AD7FF`
- Mint: `#54D6A4`
- Lavender: `#C7BCFF`
- Muted Text: `#A9A5C4`

Typography:
- Display: `Press Start 2P`
- Body: `VT323`
- Optional softer UI: `Pixelify Sans`
- Rule: display font hanya untuk label pendek, judul, dan tombol. Body panjang memakai `VT323` agar terbaca.

Spacing:
- 8pt grid dengan token 4, 8, 12, 16, 24, 32.
- Minimum tap target: 44px.
- Form field: 48-52px.

Component rules:
- Card/panel radius: 8px.
- Shadow: hard pixel shadow `4px 4px 0 #05050A`.
- Input: dark fill, 2px black border, pink focus ring.
- Button: 4px border, inset highlight, active translate 1px.
- Dialog/bottom sheet: same panel token, max height 90dvh, scrollable content.
- Icons: use `lucide-react` for functional controls; keep pixel assets for characters, background, and memory art.

## Logo Concepts

1. `pixel-love-classic.svg`
   - Single pixel heart on a light app-icon background.
   - Best for Android/iOS icon because it is readable at small size.

2. `pixel-love-duo.svg`
   - Two interlocking hearts with pink and lavender/cyan tones.
   - Best for couple identity and onboarding moments.

3. `pixel-love-cartridge.svg`
   - Heart inside a retro game cartridge silhouette.
   - Best for playful branding, splash variants, and store graphics.

## Page Recommendations

Splash / Landing:
- Old issue: too much marketing-style content and inconsistent emoji rendering.
- New direction: first viewport becomes app entry screen with full-bleed pixel background, logo, title, short promise, and two clear CTAs.
- Icons: Heart, Download, User, MessageCircle, ImageIcon, Sparkles, MapPin, Music2.
- Animation: subtle logo pulse and button press only.
- Accessibility: CTA height 56px, no horizontal overflow on 393px viewport.

Login & Register:
- Old issue: form was usable but visually dense and had inconsistent copy/encoding.
- New direction: centered auth console, segmented login/register control, clear labels with icons, 52px inputs.
- Accessibility: labels visible, error/success colors have explicit borders and text, focus ring added.
- Best practice: separate mode switching from form submit and keep feedback close to form.

Couple Connect:
- Old issue: instructions were long and pairing decision could feel ambiguous.
- New direction: two explicit cards, "Opsi A" and "Opsi B", with one rule card above.
- Accessibility: copy action has aria-label, code is large and high contrast.
- User flow: one creates code, one links code, success route goes to home.

Home:
- Old issue: beautiful retro menu but still reads like keyboard-driven desktop UI.
- Recommendation: keep category console and characters, but favor touch copy over keyboard hints on mobile.
- Components: `PixelButton`, `ls-chip`, `ls-panel`, category tiles.
- Micro interaction: heart particle on tap, character reaction, light BGM state.

Timeline / Love Story:
- Old issue: strong visual identity, but add-story modal and status cards repeat custom styles.
- Recommendation: gradually migrate cards/forms to `ls-panel`, `ls-card`, `ls-input`.
- Accessibility: keep timeline node at least 44px where tappable; add clear active/current state text.
- Motion: confetti should respect reduced motion through global media query.

Gallery / Memories:
- Old issue: good grid, but filters and modal use bespoke spacing.
- Recommendation: convert filters to `ls-chip`, keep 2-column mobile grid, use large close/next/prev controls.
- Accessibility: modal already has dialog role; keep escape and arrow navigation.
- Visual: avoid over-pixelating uploaded photos unless intentional, so user can inspect memories.

Journal / Check-In:
- Old issue: dense calendar can overload small screens.
- Recommendation: month controls remain sticky; daily cells should expose clear status dots for both people.
- Accessibility: mood intensity should use labels and color plus shape, not color only.

Countdown Anniversary / Time Capsule:
- Old issue: forms and countdown blocks are functional but can become blocky.
- Recommendation: use one primary creation panel, then repeated capsule cards.
- Motion: unlock animation can be one short pixel sparkle burst.

Profile / Settings:
- Old issue: profile, pairing, download, and logout are stacked but visually equal.
- Recommendation: profile edit first, connection second, danger/logout last.
- Accessibility: avatar upload needs visible label/action, destructive action should remain visually distinct.

Dialogs, Modals, Bottom Sheets:
- Recommendation: use 90dvh max height, safe-area padding, one close button, primary action at bottom.
- All modal close buttons should have aria-label and 44px hit area.

## Implementation Notes

Implemented files:
- `src/index.css`
- `src/components/custom/PixelButton.tsx`
- `src/pages/LoadingScreen.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/CoupleConnect.tsx`
- `public/images/logo/pixel-love-classic.svg`
- `public/images/logo/pixel-love-duo.svg`
- `public/images/logo/pixel-love-cartridge.svg`

Verified:
- `npm run build`
- Mobile viewport 393x852: landing and auth have no horizontal overflow.
- Auth inputs are 52px tall and buttons are 44-48px+.
