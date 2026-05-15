# Premium Chat Interface - Component Reference

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  ☰  [Avatar] Persona Name  Online    [Theme] [⋯]   │  Header (64px)
├──────────────────┬──────────────────────────────────┤
│                  │                                   │
│   SIDEBAR        │                                   │
│  (300px fixed)   │                                   │
│                  │         CHAT WORKSPACE            │
│   • Persona      │                                   │
│   • New Chat     │      [Avatar Strip]              │
│   • History      │                                   │
│   • Knowledge    │       MESSAGE AREA                │
│   • Insights     │      [Messages with avatars]     │
│   (collapsed)    │                                   │
│                  │                                   │
│                  │       [Composer Input]            │
│                  │   Memory & Context [▾]            │
│                  │                                   │
└──────────────────┴──────────────────────────────────┘
```

---

## Component Specifications

### Header Component (`.top-header`)

```
Height: 64px
Layout: Flexbox space-between
Padding: 12px 20px

[☰ Menu] [Avatar] Name/Status [Theme Toggle] [⋯]
  8px      40px    12px gap    auto          8px
          + Icon Button
          + "Online" (gray) status

Background: Transparent
Border-bottom: 1px rgba(255,255,255,0.04)
Backdrop-filter: blur(12px)
```

**Key Elements:**
- Menu icon (hamburger): transparent button
- Persona avatar: 40×40px, gradient background, pulse animation
- Persona name: 1rem bold
- Online status: 0.82rem muted text
- Settings icon: transparent button

---

### Sidebar (`.side-panel`)

```
Width: 300px (fixed)
Background: Transparent
Border-right: 1px rgba(255,255,255,0.04)
Sections divided by bottom borders

┌─────────────────┐
│ Persona Section │  16px padding
│ • Avatar        │  • Summary text
│ • Name          │  • Style tags
│ • Tags          │
├─────────────────┤
│ Action Buttons  │  New Chat | History
├─────────────────┤
│ Knowledge Files │  Upload input
│ • File list     │  • List with delete
├─────────────────┤
│ Conversations   │  [When expanded]
│ • Conv list     │  • Active highlight
│ • Dates         │
└─────────────────┘
```

**Section Styling:**
- Padding: 16px
- Bottom border: 1px rgba(255,255,255,0.04)
- No background color
- Gap between sections: visual divider only

**Interactive Elements:**
- Tags: Small chips with purple accent on hover
- Buttons: Ghost style with minimal borders
- History items: Full-width, left border highlight when active
- File chips: Hover effect, delete button on right

---

### Chat Message Component (`.chat-row` + `.chat-bubble`)

#### User Message (Right-aligned)

```
                        [🎤] ┌──────────────┐
                             │ User message │
                             │ text here    │
                             └──────────────┘
                        Purple gradient bg
                        Right-aligned
```

**Styling:**
- Container: `justify-content: flex-end`
- Bubble: Max-width 600px
- Background: Linear gradient (`#7c5cff` → `#5b7fff`)
- Text: White, 1rem
- Padding: 12px 16px
- Border: 1px rgba(124,92,255,0.25)
- Shadow: 0 2px 8px rgba(124,92,255,0.15)
- Animation: fadeInUp 0.3s + bubbleScale 0.2s

#### AI Message (Left-aligned)

```
[AI] ┌──────────────┐
     │ AI response  │
     │ goes here    │
     └──────────────┘
Soft background
Left-aligned
```

**Styling:**
- Container: `justify-content: flex-start`
- Avatar: 40×40px on left
- Bubble: Max-width 600px
- Background: rgba(21,24,33,0.8)
- Text: Primary color, 1rem
- Padding: 12px 16px
- Border: 1px rgba(255,255,255,0.08)
- Shadow: 0 2px 8px rgba(0,0,0,0.2)
- Animation: fadeInUp 0.3s + bubbleScale 0.2s

#### Typing Indicator

```
[AI] ●  ●  ●
Animated dots bouncing
```

**Styling:**
- Container: Same as AI message
- Dots: 6×6px, gray, bouncing animation
- Animation: typingBounce 1.2s infinite
- Gap: 4px between dots

---

### Message Composer (`.modern-composer`)

```
┌─────────────────────────────────────────────────────┐
│ [📎] Message {persona name}... [🎤] [●]            │
└─────────────────────────────────────────────────────┘
Minimal border, integrated input
```

**Layout:**
- Grid: auto 1fr auto auto
- Gaps: 10px
- Height: Auto, minimum 40px with content

**Elements:**
- Attachment button: Icon button
- Input field: 1rem text, placeholder text
- Voice button: Icon button (future feature)
- Send button: Circular gradient button (40×40px)

**Styling:**
- Border: 1px rgba(255,255,255,0.08)
- Background: Transparent
- Focus-within: Border rgba(124,92,255,0.25), bg rgba(124,92,255,0.04)
- Margin: 0 20px 20px (card spacing)
- Border-radius: 12px
- Padding: 10px

---

### Insights Drawer (`.insights`)

```
┌──────────────────────────────────────┐
│ Memory & Context                  ▾  │  [Collapsed]
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Memory & Context                  ▸  │
│                                      │
│ ┌──────────────────────────────────┐ │  [Expanded]
│ │ 📌 Related to                    │ │
│ │ "Previous conversation about X"  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 📌 Related to                    │ │
│ │ "Memory video on Y"              │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Styling:**
- Border: 1px rgba(255,255,255,0.08)
- Background: rgba(21,24,33,0.4)
- Margin: 0 20px 20px
- Border-radius: 0
- Overflow: hidden

**Toggle Button:**
- Flex between label and chevron
- Full width
- Padding: 12px 0
- No background
- Hover: Color changes to primary

**Insight Cards:**
- Background: rgba(124,92,255,0.06)
- Border: 1px rgba(124,92,255,0.15)
- Padding: 10px 12px
- Border-radius: 8px
- Text: Muted label + bold content

**Animation:**
- Expand: expandDown 0.2s ease-out
- Opacity + max-height

---

## Color Reference

### Used in Components

**Bubbles:**
- User: `#7c5cff` to `#5b7fff` gradient
- AI: `rgba(21,24,33,0.8)` background

**Buttons:**
- Ghost: `rgba(255,255,255,0.08)` border
- Send: `#7c5cff` to `#5b7fff` gradient

**Text:**
- Primary: `#e6eaf1`
- Secondary: `#a1a7b3`
- Accent: `#7c5cff`

**Borders:**
- Light: `rgba(255,255,255,0.04)`
- Standard: `rgba(255,255,255,0.08)`
- Hover: `rgba(124,92,255,0.3)`

**Backgrounds:**
- Base: `#0f172a`
- Card: `rgba(21,24,33,0.8)`
- Hover: `rgba(255,255,255,0.06)`
- Focus: `rgba(124,92,255,0.04)`

---

## Responsive Breakpoints

### Mobile (< 768px)

```
Sidebar: Hidden, overlay when opened
Layout: Single column
Max-width bubbles: 85%
Padding: 16px (reduced from 20px)
Composer margin: 0 16px 16px
Insights margin: 0 16px 16px
```

**Sidebar Overlay:**
- Position: Fixed, top 64px, left 0
- Width: 280px
- Height: calc(100% - 64px)
- Z-index: 100
- Shadow: 2px 0 12px rgba(0,0,0,0.3)

---

## Animation Reference

### Message Entrance
```css
.chat-bubble {
  animation: fadeInUp 0.3s ease-out, bubbleScale 0.2s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bubbleScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Typing Animation
```css
.typing-dot {
  animation: typingBounce 1.2s infinite ease-in-out;
}

@keyframes typingBounce {
  0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-6px); }
}
```

### Persona Pulse
```css
.pulse-avatar {
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(124, 92, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0); }
}
```

### Insights Expand
```css
.insights-body {
  animation: expandDown 0.2s ease-out;
}

@keyframes expandDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}
```

---

## Interactive States

### Button States

**Idle:**
- Transparent background
- Subtle color

**Hover:**
- Background: `rgba(255,255,255,0.06)` or accent
- Color brightens
- Slight cursor feedback

**Active:**
- Background: Darker
- Transform: Slightly pressed (scale 0.98 for send button)

**Disabled:**
- Opacity: 0.4-0.5
- Cursor: Not-allowed
- No hover effect

### Input States

**Idle:**
- Border: `rgba(255,255,255,0.08)`
- Background: `rgba(255,255,255,0.02)`

**Focus:**
- Border: `rgba(124,92,255,0.3)`
- Background: `rgba(124,92,255,0.04)`
- Subtle glow

**Filled:**
- Border: Subtle accent
- Validation color if needed

---

## Spacing Reference

### Consistent Spacing Scale
```
xs:   4px   (micro spacing)
sm:   8px   (small gap)
md:   12px  (button padding, small gap)
lg:   16px  (section padding)
xl:   20px  (main padding)
2xl:  24px  (large spacing)
3xl:  32px  (section separation)
```

### Common Combinations
- Header: 12px 20px
- Sidebar section: 0 16px, 16px border-bottom
- Chat area: 20px
- Message gap: 16px
- Bubble padding: 12px 16px
- Button padding: 8px 12px

---

## Typography Reference

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
```

### Common Text Styles
```css
/* Header/Title */
font-size: 1rem;
font-weight: 600;
letter-spacing: -0.01em;

/* Body */
font-size: 1rem;
font-weight: 400;
line-height: 1.5;
letter-spacing: -0.01em;

/* Secondary */
font-size: 0.85rem;
font-weight: 400;
color: #a1a7b3;

/* Small */
font-size: 0.75rem;
font-weight: 500;
letter-spacing: 0.01em;
color: #a1a7b3;
```

---

## Testing Checklist

### Visual Tests
- [ ] Colors match palette
- [ ] Spacing is consistent
- [ ] Typography is readable
- [ ] Animations are smooth
- [ ] No layout shifts
- [ ] Responsive design works

### Interaction Tests
- [ ] Buttons respond to clicks
- [ ] Input focus states visible
- [ ] Messages appear correctly
- [ ] Typing animation works
- [ ] Sidebar collapse/expand smooth
- [ ] Insights toggle works

### Accessibility Tests
- [ ] Contrast ratios meet AA standard
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Mobile touch targets adequate

### Performance Tests
- [ ] Animations are smooth (60fps)
- [ ] No jank on scroll
- [ ] Input response is instant
- [ ] Page loads quickly
- [ ] Mobile performance acceptable

---

## Common Modifications

### Changing Accent Color
1. Update gradient in `.send-btn`
2. Update `.tag-row span` hover state
3. Update hover colors in buttons
4. Update `rgba(124,92,255,...)` values
5. Test on all components

### Adjusting Sidebar Width
1. Change `grid-template-columns: 300px` in `.app-layout`
2. Update mobile width in media query (280px)
3. Adjust responsive breakpoint if needed

### Modifying Animation Speed
1. Update animation duration in keyframes
2. Adjust transition durations on elements
3. Test on slower devices
4. Consider motion preferences

---

## Troubleshooting

### Messages not aligning properly
- Check `justify-content` on `.chat-row`
- Verify `max-width` on bubbles
- Ensure wrapper has `min-width: 0`

### Sidebar not collapsing
- Verify overflow settings
- Check width transition
- Ensure z-index for mobile overlay

### Animations stuttering
- Check for layout recalculations
- Verify transform is used (not top/left)
- Profile with dev tools

### Text not wrapping
- Ensure `max-width` is set
- Check `word-wrap: break-word`
- Verify `white-space: pre-wrap` for user messages

---

## Performance Tips

1. Use `transform` for animations (GPU accelerated)
2. Use `opacity` for fade effects (fast)
3. Avoid animating dimensions
4. Use `will-change` sparingly
5. Test on real devices
6. Monitor Core Web Vitals
