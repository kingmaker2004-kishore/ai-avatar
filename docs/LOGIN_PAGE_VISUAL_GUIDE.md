# Login Page - Visual Design Guide

## Overview

Complete visual specifications for the login page including layout, typography, colors, spacing, and component dimensions.

---

## Layout Specifications

### Desktop View (> 1024px)

```
┌─────────────────────────────────────────────────┐
│                  100% viewport width            │
│  ─────────────────────────────────────────────  │
│                                                 │
│  BRANDING SIDE (50%)    │    FORM SIDE (50%)   │
│  ─────────────────────  │  ──────────────────  │
│                         │                      │
│  ┌─────────────────┐    │  ┌──────────────┐   │
│  │                 │    │  │              │   │
│  │  [Avatar: 80px] │    │  │ Sign in Form │   │
│  │                 │    │  │              │   │
│  │  "AI Persona    │    │  │ Email Input  │   │
│  │   Chat"         │    │  │              │   │
│  │                 │    │  │ Password     │   │
│  │  "Grounded in   │    │  │ Input        │   │
│  │   RAG & Memory" │    │  │              │   │
│  │                 │    │  │ Remember me  │   │
│  │  [Glow circle]  │    │  │              │   │
│  │                 │    │  │ Sign In Btn  │   │
│  └─────────────────┘    │  │ (gradient)   │   │
│                         │  │              │   │
│                         │  │ ─────────────│   │
│                         │  │ or with      │   │
│                         │  │ [G] [GitHub] │   │
│                         │  │              │   │
│  Height: 100vh          │  │ Don't have   │   │
│                         │  │ account?     │   │
│                         │  │ Create one   │   │
│                         │  └──────────────┘   │
│                         │                      │
│                         │  Footer text        │
└─────────────────────────────────────────────────┘
```

### Tablet View (768px - 1024px)

```
┌──────────────────────────┐
│  BRANDING (70% height)   │
├──────────────────────────┤
│      FORM (remaining)    │
└──────────────────────────┘
```

### Mobile View (< 768px)

```
┌──────────────────┐
│ BRANDING         │
│ (150px height)   │
├──────────────────┤
│ FORM             │
│ (full width)     │
│ (centered, 400px │
│  max)            │
└──────────────────┘
```

---

## Component Dimensions

### Avatar
```
Width: 80px (desktop)
       60px (tablet)
       50px (mobile)
Height: Same as width
Border Radius: 50% (circular)
Background: Linear gradient (#7c5cff → #5b7fff)
Box Shadow: 0 20px 40px rgba(124, 92, 255, 0.25)
```

### Form Input
```
Height: 48px
Padding: 12px 16px
Border: 1px solid rgba(255,255,255,0.05)
Border Radius: 12px
Font Size: 1rem
Background: rgba(21, 24, 33, 0.8)
Transition: all 0.2s ease
```

### Button (Primary - Sign In)
```
Height: 48px
Padding: 12px 16px
Border Radius: 12px
Font Size: 1rem
Font Weight: 600
Background: linear-gradient(135deg, #7c5cff 0%, #5b7fff 100%)
Box Shadow: 0 2px 8px rgba(124, 92, 255, 0.2)
Hover Shadow: 0 8px 16px rgba(124, 92, 255, 0.3)
Hover Transform: translateY(-2px)
Transition: all 0.2s ease
```

### Button (OAuth)
```
Height: 44px
Padding: 12px
Border Radius: 12px
Font Size: 0.9rem
Border: 1px solid rgba(255,255,255,0.05)
Background: rgba(21, 24, 33, 0.8)
Hover Border: rgba(124, 92, 255, 0.3)
Hover Background: rgba(124, 92, 255, 0.08)
```

### Form Card
```
Width: 100% (max 400px)
Background: transparent (inherits parent)
Animation: fadeInUp 0.6s ease-out 0.3s
```

### Branding Card
```
Display: flex flex-direction: column align-items: center
Gap: 20px
Animation: fadeInBranding 0.6s ease-out 0.2s
```

---

## Typography

### Branding Title
```
Font Size: 2.5rem (desktop)
            2rem (tablet)
            1.5rem (mobile)
Font Weight: 700
Letter Spacing: -0.02em
Line Height: 1.2
Color: #e6eaf1
```

### Branding Tagline
```
Font Size: 1.1rem (desktop)
           1rem (tablet)
           0.95rem (mobile)
Font Weight: 400
Color: #a1a7b3
Line Height: 1.5
```

### Form Header (h2)
```
Font Size: 1.75rem (desktop)
           1.5rem (mobile)
Font Weight: 700
Color: #e6eaf1
Letter Spacing: -0.02em
```

### Form Header (subtitle)
```
Font Size: 0.95rem
Font Weight: 400
Color: #a1a7b3
```

### Form Label
```
Font Size: 0.85rem
Font Weight: 600
Color: #c4c7d0
Text Transform: uppercase
Letter Spacing: 0.01em
```

### Input Text
```
Font Size: 1rem
Font Weight: 400
Color: #e6eaf1
Font Family: inherit
```

### Input Placeholder
```
Color: #a1a7b3
Opacity: 1
```

### Button Text
```
Font Size: 1rem (primary)
           0.9rem (oauth)
Font Weight: 600
Color: #ffffff
```

### Links
```
Font Size: 0.85rem (forgot)
           0.9rem (signup)
Font Weight: 600
Color: #7c5cff
Hover Color: #9077ff
Text Decoration: underline on hover
```

### Error Message
```
Font Size: 0.9rem
Font Weight: 400
Color: #f87171
Background: rgba(248, 113, 113, 0.08)
Border: 1px solid rgba(248, 113, 113, 0.2)
Padding: 12px 14px
Border Radius: 10px
```

### Footer Text
```
Font Size: 0.8rem (desktop)
           0.75rem (mobile)
Font Weight: 400
Color: #6b7280
Line Height: 1.4
```

---

## Color Specifications

### Primary Colors
```
Background Primary: #0f172a
  RGB: 15, 23, 42
  HSL: 226°, 47%, 11%

Background Secondary: #151821
  RGB: 21, 24, 33
  HSL: 228°, 22%, 11%

Text Primary: #e6eaf1
  RGB: 230, 234, 241
  HSL: 212°, 25%, 93%

Text Secondary: #a1a7b3
  RGB: 161, 167, 179
  HSL: 213°, 9%, 67%
```

### Accent Colors
```
Accent Primary: #7c5cff
  RGB: 124, 92, 255
  HSL: 260°, 100%, 68%

Accent Primary Hover: #9077ff
  RGB: 144, 119, 255
  HSL: 260°, 100%, 73%

Accent Secondary: #5b7fff
  RGB: 91, 127, 255
  HSL: 221°, 100%, 68%
```

### Border Colors
```
Light Border: rgba(255, 255, 255, 0.04)
Standard Border: rgba(255, 255, 255, 0.05)
Focus Border: rgba(124, 92, 255, 0.3)
```

### Input Colors
```
Background: rgba(21, 24, 33, 0.8)
Background Focus: rgba(21, 24, 33, 0.95)
Border: rgba(255, 255, 255, 0.05)
Border Focus: rgba(124, 92, 255, 0.3)
```

### Error Colors
```
Error Text: #f87171
  RGB: 248, 113, 113
  HSL: 0°, 90%, 71%

Error Background: rgba(248, 113, 113, 0.08)
Error Border: rgba(248, 113, 113, 0.2)
```

---

## Spacing Specifications

### Padding
```
Form Card Top: 32px (desktop), 24px (mobile)
Form Group Gap: 20px (between inputs), 8px (label to input)
Button Height: 48px
Input Padding: 12px 16px
OAuth Button Padding: 12px
Form Divider Margin: 8px 0 12px
```

### Gaps
```
Branding Card Gap: 20px
Form Group Gap: 20px
Login Form Gap: 20px
OAuth Buttons Gap: 12px (desktop), 8px (mobile)
```

### Margins
```
Form Header: 0 0 32px (24px mobile)
Form Divider: 8px 0 12px
Footer: 40px top, 24px bottom
Branding Accent: -50px bottom, -50px right
```

### Max Widths
```
Form Card: 400px
Header: 400px
```

---

## Spacing Scale

```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 20px
2xl: 24px
3xl: 32px
4xl: 40px
5xl: 48px (button height)
6xl: 64px (header height)
```

---

## Animation Specifications

### Fade In Branding
```
Duration: 600ms
Delay: 200ms
Timing Function: ease-out
From: opacity 0, translateX(-20px)
To: opacity 1, translateX(0)
```

### Fade In Up (Form)
```
Duration: 600ms
Delay: 300ms
Timing Function: ease-out
From: opacity 0, translateY(20px)
To: opacity 1, translateY(0)
```

### Float (Avatar)
```
Duration: 3s
Timing Function: ease-in-out
Infinite: true
0% / 100%: translateY(0)
50%: translateY(-10px)
```

### Pulse Glow (Background)
```
Duration: 4s
Timing Function: ease-in-out
Infinite: true
0% / 100%: scale(1), opacity(0.5)
50%: scale(1.1), opacity(0.7)
```

### Spin (Loading)
```
Duration: 0.8s
Timing Function: linear
Infinite: true
From: rotate(0deg)
To: rotate(360deg)
```

### Slide Down (Error)
```
Duration: 300ms
Timing Function: ease-out
From: opacity 0, translateY(-10px)
To: opacity 1, translateY(0)
```

### Button Hover
```
Duration: 0.2s
Timing Function: ease
Transform: translateY(-2px)
Box Shadow: enhanced
```

### Input Focus
```
Duration: 0.2s
Timing Function: ease
Border Color: accent color
Background: slightly opaque
Box Shadow: subtle glow
```

---

## Form Input States

### Default State
```
Border: 1px solid rgba(255,255,255,0.05)
Background: rgba(21, 24, 33, 0.8)
Color: #e6eaf1
```

### Focus State
```
Border: 1px solid rgba(124, 92, 255, 0.3)
Background: rgba(21, 24, 33, 0.95)
Box Shadow: 0 0 0 3px rgba(124, 92, 255, 0.1)
Outline: none
```

### Disabled State
```
Opacity: 0.6
Cursor: not-allowed
```

### Error State
```
Border: 1px solid rgba(248, 113, 113, 0.2)
Background: rgba(248, 113, 113, 0.04) [subtle]
Display Error Message Below
```

---

## Button States

### Primary Button (Sign In)

**Default:**
```
Background: linear-gradient(135deg, #7c5cff 0%, #5b7fff 100%)
Color: #ffffff
Box Shadow: 0 2px 8px rgba(124, 92, 255, 0.2)
Cursor: pointer
```

**Hover:**
```
Transform: translateY(-2px)
Box Shadow: 0 8px 16px rgba(124, 92, 255, 0.3)
```

**Active:**
```
Transform: translateY(0)
```

**Disabled:**
```
Opacity: 0.8
Cursor: not-allowed
```

### OAuth Buttons

**Default:**
```
Background: rgba(21, 24, 33, 0.8)
Border: 1px solid rgba(255,255,255,0.05)
Color: #c4c7d0
```

**Hover:**
```
Border Color: rgba(124, 92, 255, 0.3)
Background: rgba(124, 92, 255, 0.08)
Color: #e6eaf1
```

---

## Responsive Breakpoints

### Large Desktop (> 1440px)
- No changes from 1024px+

### Desktop (1024px - 1440px)
- Standard layout
- All animations enabled

### Large Tablet (768px - 1024px)
- Smaller branding section
- Reduced padding
- Adjusted font sizes

### Mobile (480px - 768px)
- Stacked layout
- Full width form
- Reduced animations
- Smaller fonts

### Small Mobile (< 480px)
- Minimal padding
- iOS font-size fixes
- Optimized spacing
- Simplified layout

---

## Accessibility Specifications

### Focus Indicators
```
Outline: 2px solid #7c5cff
Outline Offset: 2px
Applied to: buttons, inputs, links
Visible: always (even without user-agent)
```

### Color Contrast
```
Text on Background: minimum 4.5:1 (WCAG AA)
Headings: 4.5:1 minimum
Links: 4.5:1 minimum
Error Messages: 4.5:1 minimum
```

### Touch Targets
```
Minimum Height: 44px
Minimum Width: 44px
Spacing Between: 8px
```

### Motion
```
prefers-reduced-motion: disabled
All animations: removed
All transforms: removed
Page still fully functional
```

---

## Responsive Font Sizes

### Desktop (> 1024px)
```
Branding Title: 2.5rem (40px)
Form Header: 1.75rem (28px)
Body Text: 1rem (16px)
Label: 0.85rem (13.6px)
Small: 0.9rem (14.4px)
```

### Tablet (768px - 1024px)
```
Branding Title: 2rem (32px)
Form Header: 1.5rem (24px)
Body Text: 1rem (16px)
Label: 0.85rem (13.6px)
Small: 0.9rem (14.4px)
```

### Mobile (< 768px)
```
Branding Title: 1.5rem (24px)
Form Header: 1.25rem (20px)
Body Text: 1rem (16px) ← iOS zoom prevention
Label: 0.85rem (13.6px)
Small: 0.9rem (14.4px)
```

---

## Component Example: Password Input

```jsx
<div className="form-group">
  <div className="password-header">
    <label className="form-label">Password</label>
    <a href="/forgot" className="forgot-link">Forgot?</a>
  </div>
  <div className="password-input-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      className="form-input"
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      disabled={isLoading}
    />
    <button
      className="password-toggle"
      onClick={() => setShowPassword(!showPassword)}
      disabled={isLoading}
    >
      {showPassword ? "👁️" : "🔒"}
    </button>
  </div>
</div>
```

---

## Component Example: Error Message

```jsx
{error && (
  <div className="error-message">
    <span className="error-icon">⚠️</span>
    <span>{error}</span>
  </div>
)}
```

---

## Z-Index Hierarchy

```
100: Focus visible rings
50: Error messages, tooltips
20: Loading spinner
10: Form inputs (on focus)
5: Buttons (on hover)
1: Default elements
0: Background, branding glow
```

---

## Glossary

| Term | Definition |
|------|-----------|
| Viewport | Visible browser window |
| Breakpoint | CSS media query width threshold |
| Glow Effect | Blurred background circle animation |
| Touch Target | Interactive element minimum size |
| Focus Indicator | Visual feedback for keyboard navigation |
| Glassmorphism | Frosted glass effect with transparency |
| Gradient | Smooth color transition |
| Easing | Animation acceleration curve |
| WCAG | Web Content Accessibility Guidelines |
| Semantic HTML | HTML that clearly describes meaning |

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│ LOGIN PAGE - QUICK REFERENCE            │
├─────────────────────────────────────────┤
│ Primary Accent: #7c5cff (Purple)        │
│ Primary BG: #0f172a (Deep Navy)         │
│ Text: #e6eaf1 (Light)                   │
│ Button Height: 48px                     │
│ Input Height: 48px                      │
│ Border Radius: 12px                     │
│ Animation Duration: 200-600ms           │
│ Mobile Breakpoint: 768px                │
│ Avatar Size: 80px → 50px (mobile)       │
│ Max Form Width: 400px                   │
│ Primary Font Size: 1rem (16px)          │
│ Focus Outline: 2px #7c5cff              │
│ Error Color: #f87171 (Red)              │
│                                         │
│ Key Animations:                         │
│ • Avatar float (3s)                     │
│ • Glow pulse (4s)                       │
│ • Form fade-in (600ms @ 300ms delay)    │
│ • Loading spin (800ms)                  │
│ • Error slide-down (300ms)              │
└─────────────────────────────────────────┘
```

---

This visual guide provides all the specifications needed to implement, customize, or extend the login page design.
