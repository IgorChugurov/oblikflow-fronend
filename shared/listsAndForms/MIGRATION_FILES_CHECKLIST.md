# Migration Files Checklist

Complete list of files to copy for migrating the Universal List & Form Generation system.

## Quick Reference

**Total Modules:** 4 core modules + UI components + utilities  
**Estimated Time:** 2-4 hours (depending on project setup)  
**Complexity:** Medium

---

## Core Modules

### ✅ Module 1: SDK (Data Layer)

**Location:** `src/module/sdk/`

```
src/module/sdk/
├── base/
│   └── base-client.ts                    # Base SDK client with config preloading
├── services/
│   ├── entity-service.ts                 # Service for specific entity
│   ├── universal-service.ts              # Facade for entity services
│   └── index.ts                          # Services exports
├── types/
│   ├── api-types.ts                      # API request/response types
│   └── index.ts                          # Types exports
├── utils/
│   ├── http-client.ts                    # HTTP client with token management
│   └── load-entity-options.ts            # Utility for loading relation options
├── mock/
│   ├── mock-data.ts                      # Mock data for development
│   └── mock-entity-sdk.ts                # Mock SDK implementation
├── client.ts                             # Main EntitySDK class
├── errors.ts                             # Error classes
├── index.ts                              # Main exports
└── README.md                             # SDK documentation
```

**Files:** 14  
**Dependencies:** None (self-contained)

---

### ✅ Module 2: Entity Config (Types & Specs)

**Location:** `src/module/entity-config/`

```
src/module/entity-config/
├── types/
│   ├── entity-types.ts                   # 444 lines - Main type definitions
│   ├── ui-config-types.ts                # 165 lines - UI configuration types
│   └── index.ts                          # Types exports
├── specs/
│   ├── types.ts                          # 221 lines - Compiled spec types
│   ├── compile.ts                        # Spec compilation logic
│   └── index.ts                          # Specs exports
├── utils/
│   ├── field-utils.ts                    # Field utility functions
│   └── index.ts                          # Utils exports
├── hooks/
│   ├── use-entity-options.ts             # Hook for loading entity options
│   └── index.ts                          # Hooks exports
└── index.ts                              # Main exports
```

**Files:** 11  
**Dependencies:** SDK module

---

### ✅ Module 3: Universal List

**Location:** `src/module/universal-list/`

```
src/module/universal-list/
├── components/
│   ├── actions-cell.tsx                  # Actions column (edit/delete/view)
│   ├── DataTableFacetedFilter.tsx        # Faceted filter component
│   ├── DataTableHeader.tsx               # Table header with sorting
│   ├── DataTablePagination.tsx           # Pagination controls
│   ├── DataTableToolbar.tsx              # Toolbar with search and filters
│   ├── FilterField.tsx                   # Single filter field
│   ├── TagsInCell.tsx                    # Tags display in table cell
│   └── index.ts                          # Components exports
├── hooks/
│   ├── use-list-params.ts                # URL ↔ State sync for params
│   ├── use-list-query.ts                 # React Query data fetching
│   ├── use-list-routing.ts               # URL generation and navigation
│   ├── use-list-state.ts                 # UI state management
│   └── index.ts                          # Hooks exports
├── types/
│   ├── list-types.ts                     # Main list types
│   ├── list-query-key.ts                 # Query key generation
│   └── index.ts                          # Types exports
├── utils/
│   ├── table-column-generator.tsx        # Column generation from config
│   ├── table-formatting.ts               # Value formatting utilities
│   └── index.ts                          # Utils exports
├── UniversalEntityListClient.tsx         # Main list component (business logic)
├── UniversalEntityListDataTable.tsx      # Table component (UI)
├── index.ts                              # Main exports
└── README.md                             # 523 lines - List documentation
```

**Files:** 23  
**Dependencies:** 
- Entity Config module
- SDK module
- @tanstack/react-table
- @tanstack/react-query
- UI components (table, button, dropdown, etc.)

---

### ✅ Module 4: Form Generation

**Location:** `src/module/form-generation/`

```
src/module/form-generation/
├── components/
│   ├── inputs/
│   │   ├── InputText.tsx                 # Text/Textarea input
│   │   ├── InputNumber.tsx               # Number input
│   │   ├── InputSwitch.tsx               # Boolean switch
│   │   ├── InputDate.tsx                 # Date picker
│   │   ├── InputSelect.tsx               # Select/MultiSelect
│   │   ├── InputRelation.tsx             # Relation field selector
│   │   ├── InputArray.tsx                # Array field (add/remove items)
│   │   ├── InputColor.tsx                # Color picker
│   │   ├── InputEnvironmentValue.tsx     # Dynamic value input
│   │   └── InputFile.tsx                 # File upload component
│   ├── FormRenderer.tsx                  # Main form renderer
│   ├── InputRouter.tsx                   # Routes to appropriate input
│   ├── DeleteSection.tsx                 # Delete section (edit mode)
│   └── RelationSelect.tsx                # Relation select component
├── utils/
│   ├── createSchemaFromValidationSpec.ts # Yup schema generation
│   ├── getItemForEdit.ts                 # Data normalization
│   ├── sectionUtils.ts                   # Section utilities
│   └── index.ts                          # Utils exports
├── types.ts                              # Form types
├── index.ts                              # Main exports
└── README.md                             # 485 lines - Form documentation
```

**Files:** 20  
**Dependencies:**
- Entity Config module
- SDK module
- react-hook-form
- yup
- @hookform/resolvers
- UI components (field, input, select, etc.)

---

## UI Components (Shadcn/ui)

**Location:** `src/components/ui/`

### Required Components (23 files)

```
src/components/ui/
├── button.tsx                            # Button component
├── input.tsx                             # Input component
├── textarea.tsx                          # Textarea component
├── select.tsx                            # Select component
├── switch.tsx                            # Switch component
├── checkbox.tsx                          # Checkbox component
├── label.tsx                             # Label component
├── field.tsx                             # 276 lines - Custom field wrapper
├── table.tsx                             # Table components
├── dialog.tsx                            # Dialog/Modal component
├── confirmation-dialog.tsx               # Confirmation dialog
├── dropdown-menu.tsx                     # Dropdown menu
├── popover.tsx                           # Popover component
├── separator.tsx                         # Separator line
├── skeleton.tsx                          # Loading skeleton
├── tooltip.tsx                           # Tooltip component
├── badge.tsx                             # Badge component
├── card.tsx                              # Card component
├── sonner.tsx                            # Toast notifications
├── file-upload.tsx                       # File upload with drag-drop
├── image-preview-dialog.tsx              # Image preview dialog
├── avatar.tsx                            # Avatar component (optional)
└── sheet.tsx                             # Sheet/Drawer (optional)
```

**Dependencies:**
- @radix-ui/react-* (multiple packages)
- lucide-react (icons)
- sonner (toasts)
- react-dropzone (file upload)

---

## Utilities & Helpers

### Core Utilities

**Location:** `src/lib/`

```
src/lib/
├── utils.ts                              # cn() classname utility
└── toast.ts                              # Toast helper functions
```

**Files:** 2

---

### Hooks

**Location:** `src/hooks/`

```
src/hooks/
└── useToast.ts                           # 114 lines - Hybrid toast hook
```

**Files:** 1

---

### Navigation (Optional but Recommended)

**Location:** `src/navigation/`

```
src/navigation/
├── NavigationProvider.tsx                # Navigation context provider
├── useNavigation.ts                      # Navigation hook
├── useSearchParams.ts                    # URL search params hook
├── usePathname.ts                        # Pathname hook
├── AnimatedRoute.tsx                     # Animated route wrapper
├── types.ts                              # Navigation types
└── index.ts                              # Navigation exports
```

**Files:** 7  
**Dependencies:** react-router-dom

---

## Provider Components (Optional)

**Location:** `src/components/providers/`

```
src/components/providers/
├── SDKProvider.tsx                       # SDK context provider
├── QueryProvider.tsx                     # React Query provider
└── ThemeProvider.tsx                     # Theme provider (optional)
```

**Files:** 3  
**Dependencies:** 
- @tanstack/react-query
- next-themes (optional)

---

## Type Definitions (Optional)

**Location:** `src/types/`

```
src/types/
└── microfrontendContract.ts              # Microfrontend types (optional)
```

**Files:** 1

---

## Summary

### Files Count

| Category | Files | Lines of Code |
|----------|-------|---------------|
| SDK Module | 14 | ~1,500 |
| Entity Config Module | 11 | ~1,200 |
| Universal List Module | 23 | ~2,000 |
| Form Generation Module | 20 | ~2,500 |
| UI Components | 23 | ~3,000 |
| Utilities | 3 | ~300 |
| Navigation | 7 | ~500 |
| Providers | 3 | ~200 |
| **Total** | **104** | **~11,200** |

---

## Dependencies Checklist

### ✅ Required Dependencies

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.12",
    "@tanstack/react-table": "^8.21.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.3.8",
    "react-hook-form": "^7.69.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.5.4",
    "yup": "^1.7.1"
  }
}
```

### ⚠️ Optional Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.11",
    "framer-motion": "^11.18.2",
    "next-themes": "^0.4.6",
    "react-router-dom": "^6.30.2"
  }
}
```

---

## Migration Steps Checklist

### Phase 1: Preparation
- [ ] Review target project structure
- [ ] Check Node.js version (>=18.13.0)
- [ ] Check TypeScript version (>=5.8.2)
- [ ] Backup target project

### Phase 2: Core Modules
- [ ] Copy SDK module (14 files)
- [ ] Copy Entity Config module (11 files)
- [ ] Copy Universal List module (23 files)
- [ ] Copy Form Generation module (20 files)

### Phase 3: UI Components
- [ ] Copy all required UI components (23 files)
- [ ] Copy optional components if needed

### Phase 4: Utilities
- [ ] Copy lib utilities (2 files)
- [ ] Copy hooks (1 file)
- [ ] Copy navigation (7 files) - optional
- [ ] Copy providers (3 files) - optional

### Phase 5: Configuration
- [ ] Update tsconfig.json (path aliases)
- [ ] Configure Tailwind CSS
- [ ] Add CSS variables
- [ ] Install all dependencies

### Phase 6: Integration
- [ ] Setup React Query provider
- [ ] Initialize SDK
- [ ] Create SDK provider (optional)
- [ ] Test SDK connection

### Phase 7: Verification
- [ ] Test universal list component
- [ ] Test form generation component
- [ ] Verify API integration
- [ ] Test CRUD operations
- [ ] Check validation
- [ ] Test file uploads
- [ ] Verify filtering and search

### Phase 8: Customization
- [ ] Adjust UI components to match design
- [ ] Configure entity definitions
- [ ] Setup routing
- [ ] Add error handling
- [ ] Configure toast notifications

---

## Quick Copy Commands (Unix/Linux/Mac)

### Copy All Modules at Once

```bash
# From source project root
SOURCE_DIR="./src"
TARGET_DIR="/path/to/target/project/src"

# Copy core modules
cp -r "$SOURCE_DIR/module/sdk" "$TARGET_DIR/module/"
cp -r "$SOURCE_DIR/module/entity-config" "$TARGET_DIR/module/"
cp -r "$SOURCE_DIR/module/universal-list" "$TARGET_DIR/module/"
cp -r "$SOURCE_DIR/module/form-generation" "$TARGET_DIR/module/"

# Copy UI components
cp -r "$SOURCE_DIR/components/ui" "$TARGET_DIR/components/"

# Copy utilities
cp -r "$SOURCE_DIR/lib" "$TARGET_DIR/"
cp -r "$SOURCE_DIR/hooks" "$TARGET_DIR/"

# Copy navigation (optional)
cp -r "$SOURCE_DIR/navigation" "$TARGET_DIR/"

# Copy providers (optional)
cp -r "$SOURCE_DIR/components/providers" "$TARGET_DIR/components/"
```

### Copy Specific Module

```bash
# SDK only
cp -r ./src/module/sdk /path/to/target/project/src/module/

# Universal List only
cp -r ./src/module/universal-list /path/to/target/project/src/module/

# Form Generation only
cp -r ./src/module/form-generation /path/to/target/project/src/module/
```

---

## Troubleshooting Checklist

### Module Resolution Issues
- [ ] Check tsconfig.json paths
- [ ] Verify @src/* alias is configured
- [ ] Restart TypeScript server
- [ ] Clear node_modules and reinstall

### Style Issues
- [ ] Verify Tailwind CSS is installed
- [ ] Check tailwind.config.js content paths
- [ ] Ensure CSS variables are defined
- [ ] Check @tailwind directives in CSS

### Build Errors
- [ ] Check all dependencies are installed
- [ ] Verify TypeScript version
- [ ] Check for missing peer dependencies
- [ ] Review import paths

### Runtime Errors
- [ ] Verify API URL is correct
- [ ] Check authentication token
- [ ] Review browser console for errors
- [ ] Check network requests in DevTools

---

## Additional Resources

- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Detailed step-by-step instructions
- **Usage Guide:** [USAGE_GUIDE.md](./USAGE_GUIDE.md) - Complete API and usage documentation
- **SDK README:** [../src/module/sdk/README.md](../src/module/sdk/README.md)
- **List README:** [../src/module/universal-list/README.md](../src/module/universal-list/README.md)
- **Form README:** [../src/module/form-generation/README.md](../src/module/form-generation/README.md)

---

## Support

For questions or issues during migration:
1. Review individual module README files
2. Check type definitions in `entity-types.ts`
3. Refer to MIGRATION_GUIDE.md for detailed instructions
4. Consult USAGE_GUIDE.md for API reference

---

**Last Updated:** 2026-01-17  
**System Version:** 1.0.0  
**Compatibility:** React 18.3+, TypeScript 5.8+
