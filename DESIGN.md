---
name: Serene Habitat
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#6f7a71'
  outline-variant: '#bfc9bf'
  surface-tint: '#1a6b45'
  primary: '#176942'
  on-primary: '#ffffff'
  primary-container: '#36825a'
  on-primary-container: '#f6fff5'
  inverse-primary: '#89d7a7'
  secondary: '#59605d'
  on-secondary: '#ffffff'
  secondary-container: '#dae1dd'
  on-secondary-container: '#5d6461'
  tertiary: '#90444d'
  on-tertiary: '#ffffff'
  tertiary-container: '#ae5c65'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a5f4c2'
  primary-fixed-dim: '#89d7a7'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005231'
  secondary-fixed: '#dde4e0'
  secondary-fixed-dim: '#c1c8c4'
  on-secondary-fixed: '#161d1b'
  on-secondary-fixed-variant: '#414846'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#3d0410'
  on-tertiary-fixed-variant: '#763039'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e0'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.01em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

The design system is rooted in **Soft Minimalism**, prioritizing emotional clarity, breathability, and an approachable character. It is designed for users seeking a calm, focused environment, specifically within the wellness, sustainable living, or lifestyle sectors. 

By stripping away non-essential decorative elements—such as complex gradients, heavy shadows, and intricate iconography—the interface relies on generous whitespace and a "pill-based" geometry to guide the user. The aesthetic is friendly and optimistic, evoking a sense of lightness and modern sophistication.

## Colors

The palette is anchored by the signature green, used purposefully for primary actions and brand emphasis. To maintain a soft and minimal feel, the secondary color acts as a subtle wash for large surfaces, reducing the contrast between the background and UI elements.

- **Primary (#4E9A6F):** Used for CTA buttons, active states, and key highlights.
- **Secondary (#F0F7F3):** A soft, desaturated tint of the primary, used for container backgrounds and hover states.
- **Neutral (#1A1C1B):** Reserved for high-contrast typography and iconography.
- **Surface:** Pure white is the default background to maximize the perception of whitespace.

## Typography

This design system utilizes **Plus Jakarta Sans** across all levels to maintain a cohesive, friendly, and modern personality. The typeface’s soft curves mirror the pill-shaped UI components.

Hierarchies are established primarily through size and weight rather than color shifts. Headlines use a tighter tracking to feel more "designed" and intentional, while body text uses a generous line height (1.6) to ensure maximum legibility and contribute to the overall airy aesthetic.

## Layout & Spacing

The layout philosophy follows a **Fluid-Fixed Hybrid**. Content is centered within a maximum-width container (1280px) on desktop, while margins expand dynamically.

Spacing is intentionally exaggerated to enforce the minimal aesthetic. 
- **Section Spacing:** Use `xl` (64px) or higher between major content blocks.
- **Component Padding:** Internal padding for cards and containers should never drop below `md` (24px) to avoid a cramped appearance.
- **Grid:** A 12-column grid is used for desktop with a 24px gutter. On mobile, transition to a 2-column or single-stack layout with 20px margins.

## Elevation & Depth

To maintain the soft and minimal visual language, elevation is conveyed through **Tonal Layering** rather than traditional shadows.

- **Level 0 (Background):** Pure white (#FFFFFF).
- **Level 1 (Containers):** Soft tint (#F0F7F3) or a very thin 1px border in a slightly darker tint. 
- **Active States:** No "pop-out" shadows are used. Depth is represented by a subtle 4% black inner-shadow or a simple color fill change.

The goal is a flat, tactile experience where "depth" is felt through the separation of soft-colored planes.

## Shapes

The shape language is the defining characteristic of this design system. We utilize an **Extra Large (Pill-shaped)** rounding strategy. 

- **Small Components (Buttons, Inputs):** Fully rounded/pill-shaped.
- **Large Components (Cards, Modals):** `rounded-xl` (3rem/48px) to maintain the bubbly, organic feel without becoming fully circular.
- **Interactive Elements:** Every corner must be rounded; sharp 90-degree angles are strictly prohibited to preserve the softness of the UI.

## Components

### Buttons
Primary buttons are pill-shaped with the Primary Green background and white text. They should have ample horizontal padding (32px). Secondary buttons use the Secondary Green tint with Primary Green text.

### Inputs & Text Fields
Inputs use a pill shape with a background color of `#F0F7F3`. Borders are removed entirely unless in an error state. Focus states are indicated by a 2px solid Primary Green stroke.

### Cards
Cards are defined by their `rounded-xl` corners and a simple `#F0F7F3` background. No shadows are applied. Padding within cards is fixed at `lg` (32px) to ensure content has room to breathe.

### Chips & Tags
Always fully rounded (pill). Use a subtle Primary Green text on the Secondary Green background for high legibility without the harshness of high-contrast borders.

### Selection Controls
Checkboxes and Radio buttons are enlarged (24x24px). Radio buttons are fully circular, while checkboxes use a heavily rounded square (8px radius) to maintain the soft-edged theme.