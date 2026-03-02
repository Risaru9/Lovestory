# Technical Specification: Pixel Love Journey

## 1. Component Inventory

### shadcn/ui Components (Built-in)

| Component | Purpose | Customization |
|-----------|---------|---------------|
| Button | Menu buttons, controls | Pixel border, retro colors |
| Dialog | Modals, photo viewer | Pixel frame, scanline overlay |
| Card | Polaroid cards, stat cards | Sharp corners, pixel shadow |
| Input | Text input for reply | Retro typewriter style |
| Textarea | Letter reply area | Paper background |
| Progress | Loading bar, song progress | Pixelated segments |
| Tabs | Filter tabs in gallery | Pixel active indicator |
| Tooltip | Hover info | Pixel bubble |
| Separator | Visual dividers | Pixel line pattern |

### Custom Components

| Component | Purpose | Location |
|-----------|---------|----------|
| PixelButton | Retro pixel-style button | components/PixelButton.tsx |
| DialogBox | RPG-style dialog container | components/DialogBox.tsx |
| StatCard | RPG character stat display | components/StatCard.tsx |
| PixelHeart | Animated heart collectible | components/PixelHeart.tsx |
| TypewriterText | Typewriter effect text | components/TypewriterText.tsx |
| Scanlines | CRT scanline overlay | components/Scanlines.tsx |
| PixelCursor | Custom cursor with trail | components/PixelCursor.tsx |
| SpriteAnimator | Sprite sheet animation | components/SpriteAnimator.tsx |
| ChapterNode | Timeline chapter marker | components/ChapterNode.tsx |
| PolaroidCard | Photo polaroid card | components/PolaroidCard.tsx |
| MusicVisualizer | Audio visualizer bars | components/MusicVisualizer.tsx |
| GameCanvas | Mini-game canvas wrapper | components/GameCanvas.tsx |
| Fireworks | Canvas fireworks effect | components/Fireworks.tsx |
| ProgressBar | Pixelated progress bar | components/ProgressBar.tsx |

### Custom Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| useTypewriter | Typewriter text effect | hooks/useTypewriter.ts |
| useKonamiCode | Konami code detection | hooks/useKonamiCode.ts |
| useLocalStorage | Save/load progress | hooks/useLocalStorage.ts |
| useAudio | Howler.js audio management | hooks/useAudio.ts |
| useScrollProgress | Track scroll position | hooks/useScrollProgress.ts |
| useGameLoop | RequestAnimationFrame game loop | hooks/useGameLoop.ts |
| usePixelAnimation | 12fps sprite animation | hooks/usePixelAnimation.ts |

## 2. Animation Implementation Table

| Animation | Library | Implementation Approach | Complexity |
|-----------|---------|------------------------|------------|
| **GLOBAL** |
| Page transitions | GSAP | Pixel dissolve using clip-path or canvas mask | High |
| Scanline overlay | CSS | CSS pseudo-element with repeating gradient | Low |
| CRT glow | CSS | Box-shadow with pink glow | Low |
| Custom cursor | React + CSS | Position tracking, heart SVG cursor | Medium |
| Cursor trail | Canvas | Draw fading hearts at cursor positions | Medium |
| **LOADING SCREEN** |
| Boot sequence | GSAP | Timeline with staggered text reveals | Medium |
| Progress bar fill | GSAP | Width animation with pixel steps | Low |
| Coin blink | CSS | Opacity animation 500ms steps | Low |
| Start pulse | GSAP | Scale pulse with yoyo | Low |
| **MAIN MENU** |
| Character walk | CSS Sprite | Sprite sheet with steps() animation | Medium |
| Heart particles | Canvas/Framer | Spawn hearts on hover, float up | Medium |
| Menu hover | CSS + GSAP | Color change + slight lift | Low |
| Cursor bounce | GSAP | x position oscillation | Low |
| BG parallax | GSAP ScrollTrigger | Mouse-based layer movement | Medium |
| **CHARACTER SELECT** |
| Character idle | CSS Sprite | 2-4 frame sprite loop | Medium |
| Character jump | GSAP | y position bounce on hover | Low |
| Stat card pop | GSAP | Scale from 0 with elastic ease | Medium |
| Dialog typewriter | Custom hook | Character reveal with timeout | Medium |
| Arrow blink | CSS | Opacity blink | Low |
| **TIMELINE** |
| Path draw | GSAP DrawSVG | SVG stroke dashoffset animation | High |
| Character follow scroll | GSAP ScrollTrigger | Position linked to scroll progress | High |
| Node pulse | GSAP | Scale pulse on unlocked nodes | Low |
| Lock shake | GSAP | x rotation shake on click | Low |
| Confetti | Canvas | Particle system with gravity | High |
| Parallax layers | GSAP ScrollTrigger | Multiple speeds per layer | Medium |
| **CHAPTER DETAIL** |
| Scene fade in | GSAP | Opacity from 0 | Low |
| Dialog typewriter | Custom hook | Same as character page | Medium |
| Photo flip | GSAP | 3D rotationY 180deg | Medium |
| Achievement pop | GSAP | Scale bounce with confetti | Medium |
| Parallax scene | GSAP ScrollTrigger | Layered depth effect | Medium |
| Hidden object glow | CSS | Pulse glow on easter eggs | Low |
| **GALLERY** |
| Polaroid hover | GSAP | Rotation + lift transform | Medium |
| Filter shuffle | Framer Motion | Layout animation with AnimatePresence | High |
| Modal open | GSAP | Scale from polaroid position | Medium |
| Modal close | GSAP | Scale to polaroid position | Medium |
| Drag drop | Framer Motion | drag prop with constraints | Medium |
| **MUSIC PLAYER** |
| Vinyl rotate | CSS | Continuous rotation when playing | Low |
| Visualizer bars | Canvas | Height animation based on frequency | High |
| Track highlight | CSS | Glow effect on active | Low |
| Progress fill | GSAP | Width sync with audio time | Low |
| **MINI GAME** |
| Heart fall | Canvas | Physics with gravity | Medium |
| Catch effect | Canvas | Particle burst on collision | Medium |
| Card flip | GSAP | 3D flip animation | Medium |
| Match glow | CSS | Glow filter on matched pairs | Low |
| Score count | GSAP | Number increment animation | Low |
| **LETTER** |
| Typewriter | Custom hook | Character reveal | Medium |
| Cursor blink | CSS | Opacity animation | Low |
| Paper extend | GSAP | Height growth with text | Low |
| Send animation | GSAP | Button press + fly away | Medium |
| **CREDITS** |
| Credits scroll | GSAP | Continuous y translation | Medium |
| Fireworks | Canvas | Particle explosions | High |
| Heart beat | GSAP | Scale pulse like heartbeat | Low |
| Scene fade | GSAP | Opacity to black | Low |

## 3. Animation Library Choices

### GSAP (Primary)

**Use for:**
- Complex timeline sequences
- ScrollTrigger animations
- SVG path animations
- 3D transforms
- Physics-based animations
- Page transitions

**Plugins needed:**
- GSAP Core
- ScrollTrigger
- DrawSVG (for path drawing)
- TextPlugin (for text effects)

### CSS Animations

**Use for:**
- Simple loops (blink, pulse, rotate)
- Sprite sheet animations
- Hover effects
- Scanline overlay
- Performance-critical continuous animations

### Framer Motion

**Use for:**
- React component mount/unmount
- Layout animations (gallery filter)
- Drag gestures
- AnimatePresence

### Canvas API

**Use for:**
- Particle systems (hearts, confetti, fireworks)
- Mini-games
- Audio visualizer
- Custom cursor trail

## 4. Project File Structure

```
/mnt/okcomputer/output/app/
├── app/
│   ├── page.tsx                    # Loading Screen (index)
│   ├── layout.tsx                  # Root layout with fonts, scanlines
│   ├── globals.css                 # Global styles, CSS variables
│   ├── home/
│   │   └── page.tsx                # Main Menu
│   ├── couple/
│   │   └── page.tsx                # Character Select
│   ├── timeline/
│   │   └── page.tsx                # Journey Map
│   ├── chapter/
│   │   └── [id]/
│   │       └── page.tsx            # Chapter Detail (dynamic)
│   ├── gallery/
│   │   └── page.tsx                # Memory Gallery
│   ├── music/
│   │   └── page.tsx                # Soundtrack Player
│   ├── game/
│   │   └── page.tsx                # Mini Games
│   ├── letter/
│   │   └── page.tsx                # Love Letter
│   └── credits/
│       └── page.tsx                # Ending
├── components/
│   ├── ui/                         # shadcn components
│   ├── PixelButton.tsx
│   ├── DialogBox.tsx
│   ├── StatCard.tsx
│   ├── PixelHeart.tsx
│   ├── TypewriterText.tsx
│   ├── Scanlines.tsx
│   ├── PixelCursor.tsx
│   ├── SpriteAnimator.tsx
│   ├── ChapterNode.tsx
│   ├── PolaroidCard.tsx
│   ├── MusicVisualizer.tsx
│   ├── GameCanvas.tsx
│   ├── Fireworks.tsx
│   ├── ProgressBar.tsx
│   └── Navigation.tsx
├── hooks/
│   ├── useTypewriter.ts
│   ├── useKonamiCode.ts
│   ├── useLocalStorage.ts
│   ├── useAudio.ts
│   ├── useScrollProgress.ts
│   ├── useGameLoop.ts
│   └── usePixelAnimation.ts
├── lib/
│   ├── utils.ts
│   ├── audio-manager.ts
│   ├── save-manager.ts
│   └── chapter-data.ts
├── types/
│   └── index.ts
├── public/
│   ├── images/
│   │   ├── backgrounds/
│   │   ├── sprites/
│   │   ├── ui/
│   │   └── chapters/
│   └── audio/
│       ├── sfx/
│       └── bgm/
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## 5. Dependencies

### Core (from init)
- next
- react
- react-dom
- typescript
- tailwindcss
- @radix-ui/* (shadcn dependencies)

### Animation
```bash
npm install gsap @gsap/react framer-motion
```

### Audio
```bash
npm install howler
npm install -D @types/howler
```

### Fonts
```bash
# Google Fonts via next/font
# Press Start 2P, VT323, Pixelify Sans
```

### Utilities
```bash
npm install clsx tailwind-merge
```

## 6. Key Implementation Details

### Pixel Art Rendering

```css
/* Ensure crisp pixel art */
.pixel-art {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -moz-crisp-edges;
}
```

### Sprite Animation

```typescript
// 12fps for authentic retro feel
const SPRITE_FPS = 12;
const frameDuration = 1000 / SPRITE_FPS;

// Use CSS steps() for sprite sheets
// animation: walk 0.333s steps(4) infinite;
```

### ScrollTrigger Setup

```typescript
// Character follows scroll on timeline
gsap.to('.player-char', {
  scrollTrigger: {
    trigger: '.timeline-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
  },
  motionPath: {
    path: '#timeline-path',
    align: '#timeline-path',
  },
});
```

### Typewriter Effect

```typescript
const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return { displayText, isComplete };
};
```

### Konami Code Detection

```typescript
const useKonamiCode = (callback: () => void) => {
  const [sequence, setSequence] = useState<string[]>([]);
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 
                      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
                      'KeyB', 'KeyA'];
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSequence = [...sequence, e.code].slice(-10);
      setSequence(newSequence);
      
      if (newSequence.join(',') === konamiCode.join(',')) {
        callback();
        setSequence([]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, callback]);
};
```

### Audio Manager

```typescript
class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private bgm: Howl | null = null;
  
  loadSFX(name: string, src: string) {
    this.sounds.set(name, new Howl({ src: [src], volume: 0.5 }));
  }
  
  playSFX(name: string) {
    this.sounds.get(name)?.play();
  }
  
  playBGM(src: string) {
    this.bgm?.stop();
    this.bgm = new Howl({ src: [src], loop: true, volume: 0.3 });
    this.bgm.play();
  }
  
  stopBGM() {
    this.bgm?.stop();
  }
}
```

## 7. Performance Optimizations

### Image Optimization
- Use PNG-8 for pixel art (smaller file size)
- Implement lazy loading for below-fold images
- Use next/image with proper sizing

### Animation Performance
- Use `transform` and `opacity` only (GPU accelerated)
- Use `will-change` sparingly on animated elements
- Throttle scroll events to 16ms (60fps)
- Use CSS animations for simple loops
- Use Canvas for particle systems (not DOM)

### Code Splitting
- Dynamic imports for heavy components
- Lazy load game canvas
- Lazy load chapter content

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 8. Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | < 640px | Single column, larger touch targets, simplified effects |
| Tablet | 640-1024px | 2-column grid, adjusted spacing |
| Desktop | > 1024px | Full experience, all effects |

## 9. Accessibility

- Keyboard navigation (arrow keys, enter, space)
- Focus indicators on all interactive elements
- ARIA labels for custom components
- Alt text for all images
- Reduced motion support
- High contrast mode support

## 10. Testing Checklist

- [ ] All animations run at 60fps
- [ ] Pixel art renders crisply (no blur)
- [ ] Audio plays correctly
- [ ] Save/load works in localStorage
- [ ] Konami code triggers easter egg
- [ ] All pages navigate correctly
- [ ] Mobile touch gestures work
- [ ] Keyboard navigation works
- [ ] Reduced motion respected
- [ ] No console errors
