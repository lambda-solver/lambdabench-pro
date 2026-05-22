---
name: react-animation
description: React animation with react/motion (Framer Motion) — declarative animations, gestures, layout animations, and performance best practices
license: MIT
compatibility: opencode
---

# React Animation with `react/motion`

Declarative animation patterns for React using `react/motion` (Framer Motion v12+).
These rules apply to all animated UI components.

## Installation

```bash
bun add react/motion
```

## Core Concepts

### Motion Components

Use `motion` prefix to animate any HTML or SVG element:

```tsx
import { motion } from "react/motion";

// Animate a div
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
/>

// Animate an SVG path
<motion.path
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 2, ease: "easeInOut" }}
/>
```

### The `animate` Prop

Drive animations with the `animate` prop. It accepts:

- **Static values**: `animate={{ opacity: 1 }}`
- **Dynamic values**: `animate={{ x: isOpen ? 0 : -100 }}`
- **Variants**: `animate="visible"` (with `variants` object)

```tsx
// Static
<motion.div animate={{ scale: 1.2 }} />

// Dynamic based on state
<motion.div animate={{ x: isOpen ? 0 : -300 }} />

// Variants (preferred for complex orchestration)
const variants = {
  hidden: { opacity: 0, x: -100 },
  visible: { opacity: 1, x: 0 },
};

<motion.div variants={variants} initial="hidden" animate="visible" />
```

### Transitions

Control timing with the `transition` prop:

```tsx
// Tween (default)
<motion.div
  animate={{ x: 100 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
/>

// Spring (natural physics)
<motion.div
  animate={{ x: 100 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
/>

// Custom cubic bezier
<motion.div
  animate={{ x: 100 }}
  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
/>
```

**Transition presets:**

| Preset | Use Case |
|--------|----------|
| `type: "spring"` | Natural, physical movement (drag, scale, position) |
| `type: "tween"` | Precise timing (opacity, color, choreographed sequences) |
| `ease: "easeInOut"` | Smooth start/end (modals, page transitions) |
| `ease: [0.4, 0, 0.2, 1]` | Material Design standard (buttons, cards) |
| `ease: [0.22, 1, 0.36, 1]` | Exponential ease-out (hero animations) |

## Gestures

### Hover

```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
/>
```

### Drag

```tsx
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1 }}
/>
```

### Scroll-Linked

```tsx
const { scrollYProgress } = useScroll();

<motion.div
  style={{ scaleX: scrollYProgress }}
  className="fixed top-0 left-0 right-0 h-1 bg-blue-500 origin-left"
/>
```

## Enter/Exit Animations with `AnimatePresence`

```tsx
import { AnimatePresence, motion } from "react/motion";

function List({ items }) {
  return (
    <AnimatePresence mode="popLayout">
      {items.map((item) => (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {item.content}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

**`AnimatePresence` rules:**

- Always provide a unique `key` for children
- Use `mode="popLayout"` for reordering animations
- Use `mode="wait"` when entering/exiting elements should not overlap

## Layout Animations

Enable automatic layout animations with the `layout` prop:

```tsx
// Automatically animates position/size changes
<motion.div layout className="bg-blue-500 rounded-lg">
  {content}
</motion.div>

// Layout + shared layout ID for morphing
<motion.div
  layoutId="card"
  className="bg-blue-500 rounded-lg"
/>
```

## Great Animation Examples

### 1. Staggered List Entrance

```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } },
};

<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={item}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### 2. Smooth Page Transition

```tsx
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### 3. Loading Skeleton Pulse

```tsx
<motion.div
  animate={{ opacity: [0.5, 1, 0.5] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  className="h-4 bg-gray-200 rounded"
/>
```

### 4. Progress Bar with Spring

```tsx
<motion.div
  className="h-1 bg-blue-500"
  initial={{ width: "0%" }}
  animate={{ width: `${progress}%` }}
  transition={{ type: "spring", stiffness: 50, damping: 15 }}
/>
```

### 5. Card Hover Lift

```tsx
<motion.div
  whileHover={{ y: -4, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
  className="bg-white rounded-xl p-6"
>
  Content
</motion.div>
```

### 6. Modal Overlay

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-2xl p-6"
      >
        {content}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### 7. Scroll-Triggered Fade In

```tsx
function FadeIn({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### 8. Micro-interaction Button

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  whileFocus={{ boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.5)" }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
  className="px-6 py-3 bg-blue-500 text-white rounded-lg"
>
  Click me
</motion.button>
```

### 9. Complex Multi-State Feature Preview (Browser Mockup)

A real-world example showing how to orchestrate multiple overlapping animations based on application state. This pattern is ideal for landing pages and documentation that demonstrate product features through animated UI mockups.

**Key techniques demonstrated:**
- **Conditional animations**: Different `animate` states based on boolean flags (`focused`, `fixing`, `reloading`)
- **Spring configuration from props**: Externalizing physics parameters for design system consistency
- **Overlapping motion layers**: Multiple `motion.div` elements animating independently within the same component
- **AnimatePresence for conditional content**: Enter/exit animations for elements that appear based on state
- **Progress bar sequencing**: Chained width animations simulating a loading process
- **Subtle overlay effects**: Low-opacity overlays that respond to interaction state

```tsx
import { motion, AnimatePresence } from "react/motion";
import { useState, useEffect } from "react";

interface AnimationConfig {
  browserSpringStiffness: number;
  browserSpringDamping: number;
  browserSpringMass: number;
}

interface BrowserPreviewProps {
  slid: boolean;      // Has the browser slid into view?
  focused: boolean;   // Is the browser being interacted with?
  fixing: boolean;    // Is a fix being applied?
  fixDiff: boolean;   // Show the fix diff panel?
  reloading: boolean; // Is the page reloading?
  reloadDone: boolean; // Has reload completed?
  config: AnimationConfig;
}

function BrowserPreview({
  slid,
  focused,
  fixing,
  fixDiff,
  reloading,
  reloadDone,
  config,
}: BrowserPreviewProps) {
  const loading = slid;
  const [loaded, setLoaded] = useState(false);

  // Simulate loading completion after slide-in
  useEffect(() => {
    if (!slid) return;
    const timer = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(timer);
  }, [slid]);

  return (
    <motion.div
      className="absolute top-0 left-0"
      suppressHydrationWarning
      initial={false}
      // Conditional animation: focused state gets scale + zIndex boost
      animate={
        focused
          ? { x: -90, y: -8, scale: 1.04, zIndex: 20 }
          : { x: -90, y: -8, scale: 1, zIndex: 0 }
      }
      // Spring physics from config for consistent feel across the app
      transition={{
        type: "spring",
        stiffness: config.browserSpringStiffness,
        damping: config.browserSpringDamping,
        mass: config.browserSpringMass / 1000,
      }}
    >
      <div className="relative flex flex-col w-68.5 h-46 rounded-2xl bg-white overflow-hidden">
        {/* Browser chrome: traffic lights + address bar */}
        <div className="flex items-center">
          <div className="flex gap-1.5">
            <div className="rounded-full bg-[#FF726A] size-2.5" />
            <div className="rounded-full bg-[#FEBC2E] size-2.5" />
            <div className="rounded-full bg-[#EAEAEA] size-2.5" />
          </div>

          {/* Address bar with loading progress */}
          <div className="relative w-36.25 h-6.5 rounded-full bg-white overflow-hidden flex items-center justify-center">
            <span className="text-[12px] text-[#888888]">localhost</span>

            {/* Loading progress bar - sequenced animations */}
            {loading && !loaded && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2.5px] bg-[#007AFF]"
                initial={{ width: "0%" }}
                animate={{ width: "85%" }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
            {loaded && !reloading && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2.5px] bg-[#007AFF]"
                initial={{ width: "85%" }}
                animate={{ width: "100%", opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            {reloading && !reloadDone && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2.5px] bg-[#007AFF]"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
            {reloadDone && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2.5px] bg-[#007AFF]"
                initial={{ width: "90%" }}
                animate={{ width: "100%", opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            )}
          </div>
        </div>

        {/* Page content with AnimatePresence for enter/exit */}
        <AnimatePresence>
          {loaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity:
                  (reloading && !reloadDone) || ((focused || fixing) && !reloading)
                    ? 0
                    : 1,
              }}
              transition={{
                duration: reloading ? 0.15 : 0.4,
                ease: "easeOut",
              }}
            >
              {/* Login form mockup */}
              <div className="mt-4.5 text-[#474747] font-medium text-base">
                login
              </div>
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex w-52.75 h-7 items-center rounded-full bg-white px-3">
                  <span className="text-[12.5px] text-[#474747]">
                    foo@bar.xyz
                  </span>
                </div>
                <div className="w-18 h-6 rounded-full bg-blue-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle overlay on focus/fix */}
        <motion.div
          className="absolute inset-0 bg-black pointer-events-none rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{
            opacity: (focused || fixing) && !reloading ? 0.015 : 0,
          }}
          transition={{ duration: reloading ? 0.15 : 0.3 }}
        />

        {/* Bottom panel that slides up on focus/fix */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-20"
          initial={{ y: "100%", opacity: 1 }}
          animate={{
            y: (focused || fixing) && !reloading ? "0%" : "100%",
            opacity: reloading ? 0 : 1,
          }}
          transition={{
            y: { type: "spring", stiffness: 400, damping: 30 },
            opacity: { duration: 0.15, ease: "easeOut" },
          }}
        >
          <NetworkPanel fixed={fixDiff} />
        </motion.div>
      </div>
    </motion.div>
  );
}
```

**Why this works:**

1. **State-driven animation**: Every `animate` prop is a pure function of props (`focused`, `fixing`, `reloading`, etc.). No imperative animation calls.
2. **Layered motion**: The component has 4 independent motion layers (container, content, overlay, bottom panel) that animate based on the same state but with different transitions.
3. **Physics consistency**: Spring parameters come from a shared `config` object, ensuring all browser mockups in the app feel the same.
4. **Sequenced loading**: The progress bar uses 4 distinct motion states (loading → loaded → reloading → reloadDone) with precise timing to tell a story.
5. **Performance**: All animations use `transform` and `opacity` only. The overlay uses a very low opacity (0.015) to avoid visual heaviness while still providing focus indication.

## Anti-Patterns

### ❌ Animating Expensive Properties

```tsx
// BAD — triggers layout recalculation every frame
<motion.div animate={{ width: 100, height: 100, left: 200, top: 200 }} />

// GOOD — use transform-only properties
<motion.div animate={{ scale: 1.5, x: 200, y: 200 }} />
```

**Always prefer:** `transform`, `opacity` over `width`, `height`, `top`, `left`, `margin`

### ❌ Missing `key` in `AnimatePresence`

```tsx
// BAD — AnimatePresence can't track elements
<AnimatePresence>
  {items.map((item) => (
    <motion.div exit={{ opacity: 0 }}>{item}</motion.div> // ❌ no key
  ))}
</AnimatePresence>

// GOOD
<AnimatePresence>
  {items.map((item) => (
    <motion.div key={item.id} exit={{ opacity: 0 }}>
      {item}
    </motion.div>
  ))}
</AnimatePresence>
```

### ❌ Inline Object in `animate` Without Memoization

```tsx
// BAD — new object every render, triggers re-animation
<motion.div animate={{ opacity: isVisible ? 1 : 0 }} />

// GOOD — use variants or memoize
const variants = { visible: { opacity: 1 }, hidden: { opacity: 0 } };
<motion.div variants={variants} animate={isVisible ? "visible" : "hidden"} />
```

### ❌ Overusing Spring for Simple Transitions

```tsx
// BAD — spring for opacity feels sluggish
<motion.div
  animate={{ opacity: 1 }}
  transition={{ type: "spring", stiffness: 100 }}
/>

// GOOD — tween for opacity, spring for position
<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{
    opacity: { duration: 0.3 },
    y: { type: "spring", stiffness: 300 },
  }}
/>
```

### ❌ Animating During Scroll Without `useScroll`

```tsx
// BAD — manual scroll listener + setState = jank
useEffect(() => {
  const handleScroll = () => setScrollY(window.scrollY);
  window.addEventListener("scroll", handleScroll);
}, []);

// GOOD — useScroll hook (optimized, RAF-driven)
const { scrollY } = useScroll();
const scale = useTransform(scrollY, [0, 500], [1, 0.8]);
<motion.div style={{ scale }} />
```

### ❌ Nested `motion` Components Without `layout`

```tsx
// BAD — parent moves but children jump
<motion.div animate={{ x: 100 }}>
  <div>Child jumps</div>
</motion.div>

// GOOD — use layout for smooth child transitions
<motion.div animate={{ x: 100 }}>
  <motion.div layout>Child animates smoothly</motion.div>
</motion.div>
```

### ❌ Heavy Computation in `useTransform`

```tsx
// BAD — runs on every frame
const value = useTransform(scrollY, (v) => expensiveCalculation(v));

// GOOD — pre-compute or use useMotionValueEvent
const value = useTransform(scrollY, [0, 1000], [0, 1]);
```

## Best Practices

### 1. Define Variants Outside Components

```tsx
// ✅ Defined once, reused, no re-renders
const cardVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
};

function Card() {
  return (
    <motion.div variants={cardVariants} initial="rest" whileHover="hover">
      Content
    </motion.div>
  );
}
```

### 2. Use `will-change` Sparingly

```tsx
// ✅ Only on actively animating elements
<motion.div
  style={{ willChange: "transform" }}
  animate={{ x: 100 }}
/>
```

### 3. Respect `prefers-reduced-motion`

```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={prefersReducedMotion ? {} : { x: 100 }}
/>
```

### 4. Lazy Load Heavy Animations

```tsx
import { lazy, Suspense } from "react";

const HeavyAnimation = lazy(() => import("./HeavyAnimation"));

<Suspense fallback={<div>Loading...</div>}>
  <HeavyAnimation />
</Suspense>
```

### 5. Use `layoutId` for Shared Element Transitions

```tsx
// Card on page A
<motion.div layoutId="card" className="w-20 h-20 bg-blue-500" />

// Expanded card on page B
<motion.div layoutId="card" className="w-full h-64 bg-blue-500" />
```

## Performance Checklist

- [ ] Use `transform` and `opacity` only when possible
- [ ] Add `will-change: transform` to actively animating elements
- [ ] Use `useReducedMotion()` for accessibility
- [ ] Avoid animating `box-shadow` and `blur` simultaneously
- [ ] Use `layout` prop only when necessary (has overhead)
- [ ] Memoize variant objects defined in components
- [ ] Use `AnimatePresence` `mode="popLayout"` for lists
- [ ] Prefer `useScroll` over manual scroll listeners

## Summary

| Pattern | Do | Don't |
|---------|-----|-------|
| Properties | `transform`, `opacity` | `width`, `height`, `top`, `margin` |
| Transitions | Spring for movement, tween for fades | Spring for opacity changes |
| Lists | `AnimatePresence` + `layout` + stable `key` | Missing keys, no exit animations |
| Scroll | `useScroll`, `useInView` | Manual `scroll` listeners + `setState` |
| Gestures | `whileHover`, `whileTap`, `whileDrag` | Manual mouse event handlers |
| Shared elements | `layoutId` | Manual position calculation |
| Accessibility | `useReducedMotion()` | Ignore motion preferences |
