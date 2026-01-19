# Migration Guide: Universal List & Form Generation System

This guide provides step-by-step instructions for migrating the universal list and form generation components from this project to another React/TypeScript project.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [File Migration](#file-migration)
5. [Dependency Installation](#dependency-installation)
6. [Configuration Setup](#configuration-setup)
7. [Integration Steps](#integration-steps)
8. [Verification](#verification)

---

## Overview

This system provides two main features:
- **Universal List** - Dynamic, configurable data table with pagination, search, filtering, and CRUD operations
- **Universal Form** - Dynamic form generation with sections, validation, conditional fields, and all field types

Both components are built on top of a **unified entity configuration system** that allows you to define your data schema once and automatically generate both list and form UIs.

### Key Benefits

- ✅ Type-safe TypeScript implementation
- ✅ Automatic UI generation from configuration
- ✅ Full CRUD operations support
- ✅ Built-in validation with Yup
- ✅ React Query for data fetching and caching
- ✅ Shadcn/ui components for modern UI
- ✅ Pagination, search, and filtering
- ✅ File upload support
- ✅ Relation field support
- ✅ Conditional field visibility

---

## System Architecture

The system consists of 4 main modules:

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐              ┌───────────────┐  │
│  │ Universal    │              │  Universal    │  │
│  │ List         │◄─────────────┤  Form         │  │
│  │ (Lists)      │              │  (Forms)      │  │
│  └──────┬───────┘              └───────┬───────┘  │
│         │                              │          │
│         └──────────┬───────────────────┘          │
│                    ▼                               │
│         ┌──────────────────────┐                  │
│         │  Entity Config       │                  │
│         │  (Types & Specs)     │                  │
│         └──────────┬───────────┘                  │
│                    │                               │
│                    ▼                               │
│         ┌──────────────────────┐                  │
│         │  SDK                 │                  │
│         │  (Data Layer)        │                  │
│         └──────────┬───────────┘                  │
│                    │                               │
└────────────────────┼───────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   REST API   │
              └──────────────┘
```

### Module Responsibilities

1. **SDK Module** (`src/module/sdk/`)
   - HTTP client with token management
   - CRUD operations for entities
   - Configuration preloading and caching
   - Proxy services for simplified API

2. **Entity Config Module** (`src/module/entity-config/`)
   - Type definitions (EntityDefinition, Field, etc.)
   - Compiled specs (ListSpec, FormSpec, ValidationSpec)
   - Field utilities and helpers
   - Single source of truth for types

3. **Universal List Module** (`src/module/universal-list/`)
   - List rendering component
   - Pagination, search, filtering
   - Column generation from config
   - React Query integration

4. **Form Generation Module** (`src/module/form-generation/`)
   - Form rendering from specs
   - All input types (text, select, file, etc.)
   - Validation with Yup
   - Section support with conditional visibility

---

## Prerequisites

Before starting migration, ensure your target project has:

- **React** 18.3+ 
- **TypeScript** 5.8+
- **Node.js** 18.13+
- **Package manager**: npm, yarn, or pnpm
- **React Router** (for navigation) - optional but recommended
- **Tailwind CSS** (for styling) - required

---

## File Migration

### Step 1: Create Module Directory Structure

Create the following directory structure in your target project:

```
src/
├── module/
│   ├── sdk/
│   ├── entity-config/
│   ├── universal-list/
│   └── form-generation/
├── components/
│   ├── ui/
│   └── providers/
├── hooks/
├── lib/
└── navigation/  (optional, for routing)
```

### Step 2: Copy Core Modules

Copy the following directories **completely** from source to target:

#### 2.1 SDK Module (Data Layer)
```bash
# Copy entire SDK directory
src/module/sdk/
  ├── base/
  │   └── base-client.ts
  ├── services/
  │   ├── entity-service.ts
  │   ├── universal-service.ts
  │   └── index.ts
  ├── types/
  │   ├── api-types.ts
  │   └── index.ts
  ├── utils/
  │   ├── http-client.ts
  │   └── load-entity-options.ts
  ├── mock/
  │   ├── mock-data.ts
  │   └── mock-entity-sdk.ts
  ├── client.ts
  ├── errors.ts
  ├── index.ts
  └── README.md
```

#### 2.2 Entity Config Module (Types & Configuration)
```bash
# Copy entire entity-config directory
src/module/entity-config/
  ├── types/
  │   ├── entity-types.ts          # Main type definitions
  │   ├── ui-config-types.ts       # UI configuration types
  │   └── index.ts
  ├── specs/
  │   ├── types.ts                 # Compiled spec types
  │   ├── compile.ts               # Spec compilation logic
  │   └── index.ts
  ├── utils/
  │   ├── field-utils.ts           # Field utility functions
  │   └── index.ts
  ├── hooks/
  │   ├── use-entity-options.ts    # Hook for loading entity options
  │   └── index.ts
  └── index.ts
```

#### 2.3 Universal List Module
```bash
# Copy entire universal-list directory
src/module/universal-list/
  ├── components/
  │   ├── actions-cell.tsx
  │   ├── DataTableFacetedFilter.tsx
  │   ├── DataTableHeader.tsx
  │   ├── DataTablePagination.tsx
  │   ├── DataTableToolbar.tsx
  │   ├── FilterField.tsx
  │   ├── TagsInCell.tsx
  │   └── index.ts
  ├── hooks/
  │   ├── use-list-params.ts
  │   ├── use-list-query.ts
  │   ├── use-list-routing.ts
  │   ├── use-list-state.ts
  │   └── index.ts
  ├── types/
  │   ├── list-types.ts
  │   ├── list-query-key.ts
  │   └── index.ts
  ├── utils/
  │   ├── table-column-generator.tsx
  │   ├── table-formatting.ts
  │   └── index.ts
  ├── UniversalEntityListClient.tsx
  ├── UniversalEntityListDataTable.tsx
  ├── index.ts
  └── README.md
```

#### 2.4 Form Generation Module
```bash
# Copy entire form-generation directory
src/module/form-generation/
  ├── components/
  │   ├── inputs/
  │   │   ├── InputText.tsx
  │   │   ├── InputNumber.tsx
  │   │   ├── InputSwitch.tsx
  │   │   ├── InputDate.tsx
  │   │   ├── InputSelect.tsx
  │   │   ├── InputRelation.tsx
  │   │   ├── InputArray.tsx
  │   │   ├── InputColor.tsx
  │   │   ├── InputEnvironmentValue.tsx
  │   │   └── InputFile.tsx
  │   ├── FormRenderer.tsx
  │   ├── InputRouter.tsx
  │   ├── DeleteSection.tsx
  │   └── RelationSelect.tsx
  ├── utils/
  │   ├── createSchemaFromValidationSpec.ts
  │   ├── getItemForEdit.ts
  │   ├── sectionUtils.ts
  │   └── index.ts
  ├── types.ts
  ├── index.ts
  └── README.md
```

### Step 3: Copy UI Components

Copy the required Shadcn/ui components:

```bash
# Required UI components
src/components/ui/
  ├── button.tsx
  ├── input.tsx
  ├── textarea.tsx
  ├── select.tsx
  ├── switch.tsx
  ├── checkbox.tsx
  ├── label.tsx
  ├── field.tsx              # Custom field component
  ├── table.tsx
  ├── dialog.tsx
  ├── confirmation-dialog.tsx
  ├── dropdown-menu.tsx
  ├── popover.tsx
  ├── separator.tsx
  ├── skeleton.tsx
  ├── tooltip.tsx
  ├── badge.tsx
  ├── card.tsx
  ├── sonner.tsx             # Toast notifications
  └── file-upload.tsx        # File upload component
```

### Step 4: Copy Utilities and Helpers

```bash
# Core utilities
src/lib/
  ├── utils.ts               # cn() utility for classnames
  └── toast.ts               # Toast utilities

# Hooks
src/hooks/
  └── useToast.ts            # Toast hook

# Navigation (optional, if using routing)
src/navigation/
  ├── NavigationProvider.tsx
  ├── useNavigation.ts
  ├── useSearchParams.ts
  ├── usePathname.ts
  ├── AnimatedRoute.tsx
  ├── types.ts
  └── index.ts
```

### Step 5: Copy Provider Components (Optional)

If you want to use the SDK provider pattern:

```bash
src/components/providers/
  ├── SDKProvider.tsx        # SDK context provider
  ├── QueryProvider.tsx      # React Query provider
  └── ThemeProvider.tsx      # Theme provider (optional)
```

### Step 6: Copy Types (if using microfrontend architecture)

```bash
src/types/
  └── microfrontendContract.ts  # Microfrontend types (optional)
```

---

## Dependency Installation

Install required npm packages:

```bash
# Core dependencies
npm install react@^18.3.1 react-dom@^18.3.1
npm install typescript@^5.8.2

# UI framework
npm install @tanstack/react-query@^5.90.12
npm install @tanstack/react-table@^8.21.3
npm install react-hook-form@^7.69.0
npm install @hookform/resolvers@^5.2.2
npm install yup@^1.7.1

# Shadcn/ui and Radix UI
npm install @radix-ui/react-dialog@^1.1.15
npm install @radix-ui/react-dropdown-menu@^2.1.16
npm install @radix-ui/react-popover@^1.1.15
npm install @radix-ui/react-select@^2.2.6
npm install @radix-ui/react-separator@^1.1.8
npm install @radix-ui/react-slot@^1.2.4
npm install @radix-ui/react-switch@^1.2.6
npm install @radix-ui/react-tooltip@^1.2.8
npm install @radix-ui/react-checkbox@^1.3.3
npm install @radix-ui/react-avatar@^1.1.11

# Styling
npm install tailwind-merge@^2.5.4
npm install clsx@^2.1.1
npm install class-variance-authority@^0.7.1

# Icons
npm install lucide-react@^0.511.0

# Notifications
npm install sonner@^2.0.7

# File upload
npm install react-dropzone@^14.3.8

# Routing (if using)
npm install react-router-dom@^6.30.2

# Animations (optional)
npm install framer-motion@^11.18.2

# Theme (optional)
npm install next-themes@^0.4.6
```

### DevDependencies

```bash
npm install -D @types/react@^18.3.18
npm install -D @types/react-dom@^18.3.5
```

---

## Configuration Setup

### Step 1: TypeScript Configuration

Ensure your `tsconfig.json` includes path aliases:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@src/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 2: Tailwind CSS Configuration

Create or update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [],
}
```

### Step 3: CSS Variables

Add these CSS variables to your main CSS file (e.g., `src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Integration Steps

### Step 1: Setup React Query Provider

Create `src/App.tsx` with React Query provider:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000,   // 5 minutes
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app content */}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
```

### Step 2: Initialize SDK

Create SDK instance in your app:

```typescript
import { createSDK } from "@src/module/sdk";

// Initialize SDK (do this once, typically in app initialization)
const sdk = await createSDK({
  apiUrl: "https://your-api.com",
  appMode: "developer", // or "manager" | "user" | "customer"
  projectId: "your-project-id",
  token: "your-auth-token",
  fetchToken: async () => {
    // Logic to refresh token if needed
    return newToken || null;
  },
  options: {
    preloadConfigs: true, // Load all configs on initialization (recommended)
  },
});

// Optional: Create SDK provider
import { createContext, useContext } from "react";

const SDKContext = createContext<{ sdk: EntitySDK } | null>(null);

export function SDKProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<EntitySDK | null>(null);

  useEffect(() => {
    createSDK({...}).then(setSdk);
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return (
    <SDKContext.Provider value={{ sdk }}>
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK() {
  const context = useContext(SDKContext);
  if (!context) throw new Error("useSDK must be used within SDKProvider");
  return context;
}
```

### Step 3: Adapt Your Backend (if needed)

The system expects your backend to provide:

1. **Entity Definitions** endpoint: `GET /entity-definitions?projectId={id}`
   - Returns array of `EntityDefinition` objects
   
2. **Entity Fields** endpoint: `GET /fields?entityDefinitionId={id}`
   - Returns array of `Field` objects

3. **Entity Instances** endpoints:
   - `GET /entity-instances/{entityId}?page=1&limit=20&search=...`
   - `GET /entity-instances/{entityId}/{instanceId}`
   - `POST /entity-instances/{entityId}`
   - `PATCH /entity-instances/{entityId}/{instanceId}`
   - `DELETE /entity-instances/{entityId}/{instanceId}`

See `src/module/entity-config/types/entity-types.ts` for complete type definitions.

---

## Verification

### Step 1: Test SDK Connection

```typescript
import { createSDK } from "@src/module/sdk";

const sdk = await createSDK({...});

// Test getting entity configurations
const allEntities = sdk.getAllEntityDefinitions();
console.log("Entities loaded:", allEntities.length);

// Test getting compiled config
const compiled = sdk.getCompiledEntityByTableName("your-table-name");
console.log("Compiled config:", compiled);
```

### Step 2: Test Universal List

```typescript
import { UniversalEntityListClient } from "@src/module/universal-list";

function TestListPage() {
  const { sdk } = useSDK();
  const compiled = sdk.getCompiledEntityByTableName("your-table");
  
  const onLoadData = async (params) => {
    return await sdk.getInstances(compiled.entityDefinitionId, params);
  };

  const onDelete = async (id: string) => {
    await sdk.deleteInstance(compiled.entityDefinitionId, id);
  };

  return (
    <UniversalEntityListClient
      projectId="your-project-id"
      serviceType="entity-instance"
      listSpec={compiled.list}
      routing={{
        createUrlTemplate: "/test/new",
        editUrlTemplate: "/test/{instanceId}",
        detailsUrlTemplate: "/test/{instanceId}",
      }}
      onLoadData={onLoadData}
      onDelete={onDelete}
    />
  );
}
```

### Step 3: Test Universal Form

```typescript
import { FormRenderer } from "@src/module/form-generation";

function TestFormPage() {
  const { sdk } = useSDK();
  const compiled = sdk.getCompiledEntityByTableName("your-table");
  
  const onSubmit = async (data) => {
    await sdk.createInstance(compiled.entityDefinitionId, data);
  };

  return (
    <FormRenderer
      sections={compiled.formCreate.sections}
      validationSpec={compiled.validationCreate}
      mode="create"
      onSubmit={onSubmit}
      formUi={compiled.formCreate.ui}
      formMessages={compiled.formCreate.messages}
    />
  );
}
```

---

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check path aliases in `tsconfig.json`
   - Ensure all files are copied correctly
   - Restart TypeScript server

2. **Style not applied**
   - Check Tailwind CSS configuration
   - Ensure CSS variables are defined
   - Check content paths in `tailwind.config.js`

3. **API errors**
   - Verify API URL and token
   - Check backend endpoints match expected format
   - Review SDK error logs

4. **Type errors**
   - Ensure all type files are copied
   - Check TypeScript version compatibility
   - Review import paths

### Getting Help

Refer to individual module README files:
- `src/module/sdk/README.md`
- `src/module/universal-list/README.md`
- `src/module/form-generation/README.md`

---

## Next Steps

After successful migration:

1. Read [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed usage instructions
2. Customize UI components to match your design system
3. Add custom field types if needed
4. Implement additional features (sorting, advanced filters, etc.)
5. Configure validation rules for your entities

---

## Summary Checklist

- [ ] Copy all 4 module directories
- [ ] Copy UI components
- [ ] Copy utilities and helpers
- [ ] Install all dependencies
- [ ] Configure TypeScript paths
- [ ] Configure Tailwind CSS
- [ ] Setup React Query provider
- [ ] Initialize SDK
- [ ] Test list component
- [ ] Test form component
- [ ] Verify API integration

---

**Migration complete!** You now have a fully functional universal list and form generation system in your project.
