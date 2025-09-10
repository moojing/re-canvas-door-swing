# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Basic Development
- `npm run dev` - Start development server (port 8080)
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Package Management
- `npm i` - Install dependencies

## Project Architecture

### Technology Stack
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **3D Graphics**: Three.js with React Three Fiber (@react-three/fiber, @react-three/drei)
- **Routing**: React Router DOM
- **State Management**: React hooks with TanStack React Query
- **Form Handling**: React Hook Form with Zod validation

### Core Application Structure
- **Entry Point**: `src/main.tsx` → `src/App.tsx`
- **Routing**: Single-page application with routes defined in `App.tsx`
  - `/` - Index page with door animation
  - `*` - 404 NotFound page
- **Main Flow**: `Index.tsx` controls the main user experience flow
  1. Shows `DoorAnimation3D` component initially
  2. Transitions to `MainContent` after animation completes

### 3D Door Animation System
The core animation logic is in `src/components/DoorAnimation3D.tsx`:

- **Door Component**: 3D door model with frame, panels, glass, and handle
- **Animation Phases**: 
  1. Door opening (0-60% progress)
  2. Camera forward movement (60-90% progress) 
  3. Fade out effect (90-100% progress)
- **Controls**: Start/reset buttons with progress indicators
- **Animation Timing**: 5-second duration with easing functions
- **Rotation**: Single door rotates around left-side axis (`doorAngle * Math.PI / 2`)

### UI Component System
- **Base Components**: Complete shadcn/ui component library in `src/components/ui/`
- **Custom Components**: Located in `src/components/`
- **Styling**: Uses Tailwind with custom design tokens and dark/light theme support
- **Icons**: Lucide React for consistent iconography

### Configuration Files
- **TypeScript**: Multiple tsconfig files for different build targets
- **Vite**: Custom config with React SWC plugin and path aliases (`@/` → `src/`)
- **Tailwind**: Custom configuration with typography plugin
- **ESLint**: React-specific linting rules with TypeScript support

### Development Notes
- Uses Lovable platform integration (via lovable-tagger plugin)
- Path aliases: `@/` resolves to `src/` directory
- Development server runs on port 8080 with IPv6 support
- No test framework currently configured