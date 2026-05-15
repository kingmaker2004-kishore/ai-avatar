# Premium AI Persona Chat Interface - Design System

## Overview

This document outlines the modern, premium design system for the AI Persona Chat Interface. The interface prioritizes conversation, immersion, and personality-driven interactions while maintaining a minimal, production-quality aesthetic.

---

## Color Palette

### Primary Colors
- **Background Base**: `#0f172a` - Deep navy, primary background
- **Surface**: `#151821` - Slightly elevated surfaces
- **Card Background**: `#1c212b` - Card and panel backgrounds

### Accent Colors
- **Accent Purple**: `#7c5cff` - Primary interactive element
- **Accent Purple Hover**: `#9077ff` - Hover state for purple elements
- **Accent Bright**: `#5b7fff` - Secondary accent (indigo-blue)

### Text Colors
- **Text Primary**: `#e6eaf1` - Main text (high contrast)
- **Text Secondary**: `#a1a7b3` - Secondary/muted text
- **Text Tertiary**: `#c4c7d0` - Tertiary text

### Semantic Colors
- **Border**: `rgba(255,255,255,0.04)` - Subtle borders
- **Border Light**: `rgba(255,255,255,0.08)` - Light borders
- **Online Green**: `#22c55e` - Online status indicator
- **Error Red**: `#f87171` - Error states

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
```

### Type Scale
| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Header/Title | 1rem - 2rem | 600 | -0.01em to -0.02em |
| Body Text | 1rem | 400 | -0.01em |
| Sidebar Title | 0.75rem | 600 | 0.08em |
| Sidebar Body | 0.85rem | 400-500 | -0.01em |
| Meta/Small | 0.75rem | 500 | 0.01em - 0.02em |

### Line Height
- Body: 1.5
- Compact: 1.4
- Headlines: 1.2

---

## Component Library

### Buttons

#### Icon Button (`.icon-btn`)
- No background by default
- Rounded: 8px
- Padding: 8px 12px
- Hover: `rgba(255,255,255,0.06)` background
- Transition: 0.2s ease

#### Ghost Button (`.ghost-btn`)
- Border: 1px `rgba(255,255,255,0.08)`
- Background: `rgba(255,255,255,0.02)`
- Hover: Purple accent with 0.3 opacity
- Padding: 8px 12px
- Border-radius: 8px

#### Send Button (`.send-btn`)
- Background: Linear gradient `#7c5cff` → `#5b7fff`
- Circular: 40px × 40px
- Hover: Scale 1.05, shadow
- Active: Scale 0.98

### Input Fields

#### Standard Input
- Border: 1px `rgba(255,255,255,0.08)`
- Background: `rgba(255,255,255,0.02)`
- Focus: Border `rgba(124,92,255,0.3)`, bg `rgba(124,92,255,0.04)`
- Padding: 8px 12px
- Border-radius: 8px
- Transition: 0.2s ease

### Message Bubbles

#### Assistant Bubble
- Background: `rgba(21,24,33,0.8)`
- Border: 1px `rgba(255,255,255,0.08)`
- Text Color: `#e6eaf1`
- Shadow: `0 2px 8px rgba(0,0,0,0.2)`

#### User Bubble
- Background: Gradient `rgba(124,92,255,0.6)` → `rgba(91,127,255,0.5)`
- Border: 1px `rgba(124,92,255,0.25)`
- Text Color: `#ffffff`
- Shadow: `0 2px 8px rgba(124,92,255,0.15)`

#### Bubble Style
- Border-radius: 16px
- Max-width: 600px
- Padding: 12px 16px
- Font-size: 1rem
- Letter-spacing: -0.01em

### Tags/Chips

#### Style Tag
- Background: `rgba(124,92,255,0.08)`
- Border: 1px `rgba(124,92,255,0.25)`
- Border-radius: 16px
- Padding: 4px 10px
- Font-size: 0.75rem
- Hover: Background `rgba(124,92,255,0.12)`

---

## Layout System

### Grid Layout
```css
.app-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 0;
}
```

- **Sidebar Width**: 300px (fixed)
- **Main Area**: Flexible, takes remaining space
- **No gaps** between sections for seamless flow

### Spacing Scale
| Scale | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |

### Header
- Height: 64px
- Padding: 12px 20px
- Border-bottom: 1px `rgba(255,255,255,0.04)`

### Sidebar
- Padding: 16px 0
- Sections: Dividers use bottom borders
- Hover effects on interactive elements

### Chat Area
- Padding: 20px
- Message gap: 16px
- Scroll behavior: Smooth

### Composer
- Height: Auto (40px minimum)
- Margin: 0 20px 20px
- Border: 1px `rgba(255,255,255,0.08)`
- Padding: 10px

---

## Animation System

### Durations
- **Fast**: 150ms
- **Standard**: 200-300ms
- **Slow**: 400-500ms

### Easing Functions
- **Default**: `cubic-bezier(0.4, 0, 0.2, 1)` (standard easing)
- **Ease-out**: Used for entrance animations
- **Ease-in-out**: Used for interactive elements

### Keyframe Animations

#### Message Entrance
```css
@keyframes fadeInUp {
  from: opacity 0, transform translateY(8px);
  to: opacity 1, transform translateY(0);
}
/* Duration: 0.3s */
```

#### Bubble Scale
```css
@keyframes bubbleScale {
  from: opacity 0, transform scale(0.95);
  to: opacity 1, transform scale(1);
}
/* Duration: 0.2s */
```

#### Typing Bounce
```css
@keyframes typingBounce {
  0%, 80%, 100%: opacity 0.4, transform translateY(0);
  40%: opacity 1, transform translateY(-6px);
}
/* Duration: 1.2s */
```

#### Pulse Ring
```css
@keyframes pulse-ring {
  0%: box-shadow 0 0 0 0 rgba(124, 92, 255, 0.35);
  70%: box-shadow 0 0 0 10px rgba(124, 92, 255, 0);
  100%: box-shadow 0 0 0 0 rgba(124, 92, 255, 0);
}
/* Duration: 2s */
```

#### Expand Down
```css
@keyframes expandDown {
  from: opacity 0, max-height 0;
  to: opacity 1, max-height 500px;
}
/* Duration: 0.2s */
```

---

## Sidebar Structure

The sidebar uses a unified surface approach with subtle dividers:

1. **Persona Section**
   - Avatar (optional)
   - Name
   - Short summary (1-2 lines)
   - Persona tags/chips

2. **Action Row**
   - New Chat button
   - History toggle button

3. **Knowledge Files**
   - File upload input
   - File list with delete option

4. **Conversations List** (Collapsible)
   - Conversation items
   - Active state indicator (left border + background)

All sections use:
- No background color (transparent)
- Bottom border: 1px `rgba(255,255,255,0.04)`
- Padding: 16px
- Clean spacing between sections

---

## Insights Drawer

- **State**: Collapsed by default
- **Toggle**: Click to expand/collapse
- **Layout**: 
  - Header with label and chevron
  - Body with insight cards
  - Empty state message

- **Styling**:
  - Border: 1px `rgba(255,255,255,0.08)`
  - Background: `rgba(21,24,33,0.4)`
  - Cards: `rgba(124,92,255,0.06)` with subtle border

---

## Responsive Design

### Breakpoint: max-width: 768px
- Sidebar becomes overlay
- Positioned absolutely
- Width: 280px
- Z-index: 100
- Right slide-in with shadow
- Display toggle with hamburger menu

### Message Bubbles
- Max-width: 85% (mobile)
- Max-width: 600px (desktop)

### Composer
- Mobile: margin 0 16px 16px
- Desktop: margin 0 20px 20px

---

## Best Practices

### Do ✓
- Use subtle borders and shadows
- Maintain consistent spacing
- Keep text clear and readable
- Use smooth transitions
- Prioritize conversation space
- Make persona feel alive with subtle animations
- Use negative space effectively

### Don't ✗
- Heavy glowing effects
- Excessive borders
- Dashboard-style layouts
- Large rounded containers
- Oversized UI chrome
- Harsh color contrasts
- Abrupt transitions
- Complex visual hierarchies

---

## Accessibility

### Color Contrast
- Primary text: 13:1 ratio (AAA standard)
- Secondary text: 8:1 ratio
- Interactive elements: Clear visual feedback

### Focus States
- Visible keyboard focus indicators
- Focus-visible on all interactive elements
- Minimum 44px touch targets

### Motion
- Respects `prefers-reduced-motion`
- Animations are subtle and purposeful
- No auto-playing videos or animations

---

## Usage Guide

### Implementing New Components
1. Follow the color palette
2. Use spacing scale for consistency
3. Apply appropriate animations
4. Ensure responsive behavior
5. Test accessibility

### Customization
- Adjust `--accent-color` for theme changes
- Modify color variables in root selector
- Update animation durations in keyframes
- Adjust sidebar width in grid layout

---

## Future Enhancements

Potential additions to maintain and expand this design system:

1. **Dark/Light Theme Toggle** - Add light theme variant
2. **Custom Colors** - User-selectable accent colors
3. **Typography Customization** - Font size adjustments
4. **Animation Preferences** - Respect motion preferences
5. **Sidebar Variants** - Collapsible sidebar with draggable width
6. **Custom Avatars** - Image upload for persona avatars
7. **Message Reactions** - Emoji reactions on messages
8. **Search** - Search conversation history

---

## References

- **Design Inspiration**: ChatGPT, Character AI, Discord, WhatsApp, Perplexity
- **Framework**: React + TypeScript
- **CSS**: Custom CSS with animations
- **Font**: System font stack with Inter fallback
