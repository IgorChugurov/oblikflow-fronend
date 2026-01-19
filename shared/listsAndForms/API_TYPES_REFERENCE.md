# API Types Reference

Quick reference guide for all types used in the Universal List & Form Generation system.

## Table of Contents

1. [Core Entity Types](#core-entity-types)
2. [Field Types](#field-types)
3. [Compiled Specs](#compiled-specs)
4. [List Types](#list-types)
5. [Form Types](#form-types)
6. [SDK Types](#sdk-types)
7. [Example Configurations](#example-configurations)

---

## Core Entity Types

### EntityDefinition

Main entity configuration from database:

```typescript
interface EntityDefinition {
  // Identity
  id: string;                              // "entity-123"
  name: string;                            // "Product"
  tableName: string;                       // "products"
  url?: string;                            // "/products" (optional)
  description?: string | null;             // Entity description
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
  
  // Permissions
  createPermission: "ALL" | "User" | "Admin" | "Admin|User" | "Owner" | "Owner|Admin" | "Owner|User";
  readPermission: "ALL" | "User" | "Admin" | "Admin|User" | "Owner" | "Owner|Admin" | "Owner|User";
  updatePermission: "ALL" | "User" | "Admin" | "Admin|User" | "Owner" | "Owner|Admin" | "Owner|User";
  deletePermission: "ALL" | "User" | "Admin" | "Admin|User" | "Owner" | "Owner|Admin" | "Owner|User";
  
  // Form sections (0-3)
  titleSection0?: string | null;           // "General Information"
  titleSection1?: string | null;           // "Pricing"
  titleSection2?: string | null;           // "Media"
  titleSection3?: string | null;           // "Advanced"
  
  // UI overrides (stored in DB as JSONB)
  uiConfig?: PartialUIConfig | null;
  
  // List settings
  enablePagination?: boolean | null;       // default: true
  pageSize?: number | null;                // default: 20
  enableFilters?: boolean | null;          // default: false
  
  // File upload limits
  maxFileSizeMb?: number | null;           // default: 5
  maxFilesCount?: number | null;           // default: 10
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Field

Field configuration for entity:

```typescript
interface Field {
  // Identity
  id: string;
  entityDefinitionId: string;
  name: string;                            // "title", "price", "categoryId"
  label: string;                           // "Product Title", "Price"
  
  // Types
  dbType: DbType;                          // Database type
  type: FieldType;                         // UI input type
  
  // Visibility
  forCreatePage: boolean;                  // Show in create form
  forEditPage: boolean;                    // Show in edit form
  forEditPageDisabled: boolean;            // Read-only in edit
  displayInTable: boolean;                 // Show in list table
  isOptionTitleField: boolean;             // Use as title in selects
  
  // Layout
  displayIndex: number;                    // Order (0, 1, 2, ...)
  sectionIndex: number;                    // Section 0-3
  
  // Validation
  required: boolean;
  requiredText?: string | null;            // "Title is required"
  
  // UI
  placeholder?: string | null;
  description?: string | null;
  
  // Search & Filter
  searchable: boolean;                     // Include in search
  filterableInList?: boolean;              // Show in list filters
  
  // Options (for select fields)
  options?: FieldOption[];
  loadOptions?: boolean;                   // Load from related entity
  
  // Relations
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
  isRelationSource: boolean;
  selectorRelationId?: string | null;
  selectorSourceId?: string | null;
  
  // Related field info (for display)
  relationFieldName?: string | null;
  relationFieldLabel?: string | null;
  relationFieldRequired?: boolean;
  relationFieldRequiredText?: string | null;
  
  // Default values
  defaultStringValue?: string | null;
  defaultNumberValue?: number | null;
  defaultBooleanValue?: boolean | null;
  defaultDateValue?: string | null;
  
  // API configuration
  autoPopulate: boolean;
  includeInSinglePma: boolean;
  includeInListPma: boolean;
  includeInSingleSa: boolean;
  includeInListSa: boolean;
  
  // Conditional visibility
  foreignKey?: string | null;              // Depends on field
  foreignKeyValue?: string | null;         // "value1|value2" or "any"
  
  // Dynamic value field
  typeFieldName?: string | null;           // default: "type"
  optionsFieldName?: string | null;        // default: "options"
  
  // Additional
  exclude?: string | null;                 // Exclude entity ID from options
  
  // File upload
  acceptFileTypes?: string | null;         // "image/*", "application/pdf"
  maxFileSize?: number | null;             // bytes
  maxFiles?: number | null;
  storageBucket?: string | null;           // "files", "images"
  useAsPreviewImage?: boolean;             // Use as preview in table
  
  // Multi-language (future)
  multiLanguage: boolean;
  
  // Additional settings
  minValueText?: string | null;
  maxValueText?: string | null;
  arrayEmptyText?: string | null;
  errorMessage?: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### EntityDefinitionConfig

Entity with fields (from SDK):

```typescript
interface EntityDefinitionConfig {
  entityDefinition: EntityDefinition;
  fields: Field[];                         // Sorted by displayIndex
}
```

---

## Field Types

### DbType (Database Types)

```typescript
type DbType =
  | "varchar"        // String
  | "float"          // Number
  | "boolean"        // Boolean
  | "timestamptz"    // Date/Time
  | "manyToOne"      // Foreign key (single)
  | "oneToMany"      // Relation (multiple)
  | "manyToMany"     // Relation (multiple)
  | "oneToOne"       // Foreign key (single)
  | "files";         // File storage
```

### FieldType (UI Types)

```typescript
type FieldType =
  // Text
  | "text"           // Single line text
  | "textarea"       // Multi-line text
  | "email"          // Email input
  | "password"       // Password input
  | "copy"           // Copy to clipboard
  | "view"           // Read-only view
  
  // Numbers
  | "number"         // Number input
  
  // Boolean
  | "boolean"        // Checkbox
  | "switch"         // Toggle switch
  
  // Date
  | "date"           // Date picker
  
  // Select
  | "select"         // Single select
  | "multipleSelect" // Multiple select
  | "radio"          // Radio buttons
  
  // Files
  | "file"           // Single file
  | "files"          // Multiple files
  | "image"          // Single image
  | "images"         // Multiple images
  
  // Special
  | "array"          // Array of strings
  | "color"          // Color picker
  | "dynamicValue"   // Dynamic type
  | "deleteButton";  // Delete button (edit only)
```

### FieldOption

Option for select fields:

```typescript
interface FieldOption {
  id?: string;       // Option ID
  value?: string;    // Option value
  label?: string;    // Option label
  name?: string;     // Option name (alternative to label)
}
```

### FieldValue

Possible field values:

```typescript
type FieldValue =
  | string
  | number
  | boolean
  | Date
  | string[]         // For relations/arrays
  | null
  | undefined;
```

---

## Compiled Specs

### CompiledEntityConfig

Complete compiled configuration (from SDK):

```typescript
interface CompiledEntityConfig {
  specVersion: 1;                          // Spec version
  
  // Entity identity
  entityDefinitionId: string;
  tableName: string;
  entityName: string;
  
  // Specs
  list: ListSpec;                          // For list page
  formCreate: FormSpec;                    // For create page
  formEdit: FormSpec;                      // For edit page
  validationCreate: ValidationSpec;        // Create validation
  validationEdit: ValidationSpec;          // Edit validation
}
```

### ListSpec

Compiled list configuration:

```typescript
interface ListSpec {
  // Header
  pageTitle: string;                       // "Products"
  description?: string;
  searchPlaceholder?: string;              // "Search products..."
  emptyStateTitle: string;                 // "No products found"
  emptyStateMessages: string[];            // ["Create your first product"]
  
  // Buttons
  showCreateButton: boolean;
  createButtonText: string;                // "New Product"
  
  // Functionality
  showSearch: boolean;
  enablePagination: boolean;
  pageSize: number;
  enableFilters: boolean;
  searchableFields: string[];              // ["title", "description"]
  
  // Table
  columns: ColumnConfig[];
  filters: FilterSpec[];
}
```

### FormSpec

Compiled form configuration:

```typescript
interface FormSpec {
  mode: "create" | "edit";
  sections: FormSectionSpec[];             // Sections with fields
  ui: FormUiSpec;                          // UI labels
  messages: FormMessagesSpec;              // Messages
  entityName: string;                      // For delete confirmation
  relationFieldNames: string[];            // Relation fields
}
```

### FormSectionSpec

Form section with fields:

```typescript
interface FormSectionSpec {
  id: number | string;                     // 0, 1, 2, 3, or 999 (delete)
  title: string;                           // "General Information"
  controls: FormFieldSpec[];               // Fields in section
  action?: {
    action: "delete";
    title: string;
    options?: {
      modalTitle?: string;
      modalText?: string;
      confirmWord?: string;
      confirmText?: string;
    };
  };
}
```

### FormFieldSpec

Compiled field for form:

```typescript
interface FormFieldSpec {
  // Identity
  id: string;
  name: string;
  label: string;
  type: FieldType;
  dbType: DbType;
  
  // Layout
  sectionIndex: number;
  displayIndex: number;
  
  // Visibility
  forCreatePage: boolean;
  forEditPage: boolean;
  forEditPageDisabled: boolean;
  visibleWhen?: VisibilityRuleSpec;
  
  // Validation
  required: boolean;
  requiredText?: string | null;
  nullable: boolean;
  
  // UI
  placeholder?: string | null;
  description?: string | null;
  options?: OptionSpec[];
  loadOptions?: boolean;
  relatedEntityDefinitionId?: string | null;
  relationMode?: "single" | "multi";
  
  // Files
  acceptFileTypes?: string | null;
  maxFileSize?: number | null;
  maxFiles?: number | null;
  storageBucket?: string | null;
  
  // Defaults
  defaultStringValue?: string | null;
  defaultNumberValue?: number | null;
  defaultBooleanValue?: boolean | null;
  defaultDateValue?: string | null;
  
  // Conditional
  foreignKey?: string | null;
  foreignKeyValue?: string | null;
  typeFieldName?: string | null;
  optionsFieldName?: string | null;
}
```

### ValidationSpec

Validation rules:

```typescript
interface ValidationSpec {
  fields: ValidationRuleSpec[];
}

interface ValidationRuleSpec {
  name: string;
  type: FieldType;
  required: boolean;
  requiredText?: string | null;
  nullable: boolean;
  visibleWhen?: VisibilityRuleSpec;
  acceptFileTypes?: string | null;
  maxFileSize?: number | null;
  maxFiles?: number | null;
}
```

---

## List Types

### LoadParams

Parameters for data loading:

```typescript
interface LoadParams {
  page: number;                            // Current page (1-based)
  limit: number;                           // Page size
  search?: string;                         // Search query
  filters?: Record<string, string[]>;      // { category: ["1", "2"] }
  filterModes?: Record<string, FilterMode>; // { category: "any" }
  sortBy?: string;                         // "createdAt" (future)
  sortOrder?: "asc" | "desc";              // Sort direction
}

type FilterMode = "any" | "all";
```

### LoadDataResult

Result of data loading:

```typescript
interface LoadDataResult<TData> {
  data: TData[];
  pagination: PaginationInfo;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
```

### RoutingConfig

URL templates:

```typescript
interface RoutingConfig {
  createUrlTemplate: string;               // "/products/new"
  editUrlTemplate: string;                 // "/products/{instanceId}"
  detailsUrlTemplate: string;              // "/products/{instanceId}"
}
```

---

## Form Types

### FormData

Form data object:

```typescript
interface FormData {
  [fieldName: string]: FieldValue;
}

// Example
const formData: FormData = {
  title: "Product Name",
  price: 99.99,
  active: true,
  categoryId: "cat-123",
  tags: ["tag-1", "tag-2"],
};
```

---

## SDK Types

### SDKConfig

SDK initialization configuration:

```typescript
interface SDKConfig {
  apiUrl: string;                          // "https://api.example.com"
  appMode: "developer" | "manager" | "user" | "customer";
  projectId: string;
  facilityId?: string;                     // Optional
  token: string;                           // JWT token
  fetchToken: () => Promise<string | null>; // Token refresh function
  options?: {
    preloadConfigs?: boolean;              // default: true
  };
}
```

### EntitySDK

Main SDK interface:

```typescript
interface EntitySDK {
  // Configuration (sync)
  getEntityDefinitionConfig(id: string): EntityDefinitionConfig | undefined;
  getEntityDefinitionByTableName(tableName: string): EntityDefinitionConfig | undefined;
  getCompiledEntityByTableName(tableName: string): CompiledEntityConfig | undefined;
  getAllEntityDefinitions(): EntityDefinition[];
  getAllTableNames(): string[];
  getAllEntitiesMetadata(): EntityMetadata[];
  
  // CRUD (async)
  getInstances<T>(entityId: string, params?: GetInstancesOptions): Promise<ListResponse<T>>;
  getAllInstances<T>(entityId: string, params?: GetInstancesOptions): Promise<T[]>;
  getInstance<T>(entityId: string, instanceId: string): Promise<T>;
  createInstance<T>(entityId: string, data: InstanceData): Promise<T>;
  updateInstance<T>(entityId: string, instanceId: string, data: Partial<InstanceData>): Promise<T>;
  deleteInstance(entityId: string, instanceId: string): Promise<void>;
  
  // Proxy Services
  universalService: UniversalService;
  
  // Cache
  clearCache(): void;
}
```

### ListResponse

API list response:

```typescript
interface ListResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
```

---

## Example Configurations

### Example 1: Simple Product Entity

```typescript
// EntityDefinition
{
  id: "entity-product-123",
  name: "Product",
  tableName: "products",
  type: "primary",
  projectId: "proj-123",
  
  createPermission: "Admin",
  readPermission: "ALL",
  updatePermission: "Admin",
  deletePermission: "Admin",
  
  titleSection0: "Product Information",
  titleSection1: "Pricing",
  
  enablePagination: true,
  pageSize: 20,
}

// Fields
[
  {
    id: "field-1",
    name: "title",
    label: "Product Name",
    dbType: "varchar",
    type: "text",
    displayIndex: 0,
    sectionIndex: 0,
    required: true,
    requiredText: "Product name is required",
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    searchable: true,
  },
  {
    id: "field-2",
    name: "price",
    label: "Price",
    dbType: "float",
    type: "number",
    displayIndex: 1,
    sectionIndex: 1,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    defaultNumberValue: 0,
  },
  {
    id: "field-3",
    name: "active",
    label: "Active",
    dbType: "boolean",
    type: "switch",
    displayIndex: 2,
    sectionIndex: 1,
    required: false,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    defaultBooleanValue: true,
  }
]
```

### Example 2: Entity with Relations

```typescript
// Blog Post entity with category relation

// Fields
[
  {
    id: "field-1",
    name: "title",
    label: "Post Title",
    dbType: "varchar",
    type: "text",
    displayIndex: 0,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    searchable: true,
  },
  {
    id: "field-2",
    name: "categoryId",
    label: "Category",
    dbType: "manyToOne",
    type: "select",
    displayIndex: 1,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    relatedEntityDefinitionId: "entity-category-123",
    loadOptions: true,
    filterableInList: true,
  },
  {
    id: "field-3",
    name: "tags",
    label: "Tags",
    dbType: "manyToMany",
    type: "multipleSelect",
    displayIndex: 2,
    sectionIndex: 0,
    required: false,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    relatedEntityDefinitionId: "entity-tag-123",
    loadOptions: true,
    filterableInList: true,
  }
]
```

### Example 3: Entity with Conditional Fields

```typescript
// Product with type-specific fields

[
  {
    id: "field-1",
    name: "type",
    label: "Product Type",
    dbType: "varchar",
    type: "select",
    displayIndex: 0,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    options: [
      { id: "physical", name: "Physical Product" },
      { id: "digital", name: "Digital Product" },
      { id: "service", name: "Service" }
    ],
  },
  {
    id: "field-2",
    name: "weight",
    label: "Weight (kg)",
    dbType: "float",
    type: "number",
    displayIndex: 1,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: false,
    // Only show when type = "physical"
    foreignKey: "type",
    foreignKeyValue: "physical",
  },
  {
    id: "field-3",
    name: "downloadUrl",
    label: "Download URL",
    dbType: "varchar",
    type: "text",
    displayIndex: 2,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: false,
    // Only show when type = "digital"
    foreignKey: "type",
    foreignKeyValue: "digital",
  }
]
```

### Example 4: Entity with File Upload

```typescript
[
  {
    id: "field-1",
    name: "name",
    label: "Document Name",
    dbType: "varchar",
    type: "text",
    displayIndex: 0,
    sectionIndex: 0,
    required: true,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
  },
  {
    id: "field-2",
    name: "thumbnail",
    label: "Thumbnail",
    dbType: "files",
    type: "image",
    displayIndex: 1,
    sectionIndex: 0,
    required: false,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    acceptFileTypes: "image/*",
    maxFileSize: 5000000,  // 5MB
    maxFiles: 1,
    storageBucket: "thumbnails",
    useAsPreviewImage: true,
  },
  {
    id: "field-3",
    name: "attachments",
    label: "Attachments",
    dbType: "files",
    type: "files",
    displayIndex: 2,
    sectionIndex: 0,
    required: false,
    forCreatePage: true,
    forEditPage: true,
    displayInTable: false,
    acceptFileTypes: "application/pdf,.doc,.docx",
    maxFileSize: 10000000,  // 10MB
    maxFiles: 5,
    storageBucket: "documents",
  }
]
```

### Example 5: Complete Entity Configuration

```typescript
// Complete configuration for a Blog Post entity

const entityDefinition: EntityDefinition = {
  id: "entity-post-123",
  name: "Blog Post",
  tableName: "blog_posts",
  url: "/blog-posts",
  description: "Blog posts for the website",
  type: "primary",
  projectId: "proj-123",
  
  createPermission: "Admin|User",
  readPermission: "ALL",
  updatePermission: "Owner|Admin",
  deletePermission: "Owner|Admin",
  
  titleSection0: "Post Content",
  titleSection1: "Publishing Options",
  titleSection2: "Media & SEO",
  
  enablePagination: true,
  pageSize: 20,
  enableFilters: true,
  
  maxFileSizeMb: 5,
  maxFilesCount: 10,
  
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const fields: Field[] = [
  // Section 0: Post Content
  {
    id: "field-1",
    entityDefinitionId: "entity-post-123",
    name: "title",
    label: "Post Title",
    dbType: "varchar",
    type: "text",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 0,
    sectionIndex: 0,
    isOptionTitleField: true,
    required: true,
    requiredText: "Title is required",
    searchable: true,
    filterableInList: false,
    placeholder: "Enter post title",
    description: "The main title of your blog post",
    autoPopulate: false,
    includeInSinglePma: true,
    includeInListPma: true,
    includeInSingleSa: true,
    includeInListSa: true,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "field-2",
    entityDefinitionId: "entity-post-123",
    name: "content",
    label: "Post Content",
    dbType: "varchar",
    type: "textarea",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: false,
    displayIndex: 1,
    sectionIndex: 0,
    isOptionTitleField: false,
    required: true,
    requiredText: "Content is required",
    searchable: true,
    placeholder: "Write your post content here...",
    autoPopulate: false,
    includeInSinglePma: true,
    includeInListPma: false,
    includeInSingleSa: true,
    includeInListSa: false,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Section 1: Publishing Options
  {
    id: "field-3",
    entityDefinitionId: "entity-post-123",
    name: "status",
    label: "Status",
    dbType: "varchar",
    type: "select",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 2,
    sectionIndex: 1,
    isOptionTitleField: false,
    required: true,
    searchable: false,
    filterableInList: true,
    options: [
      { id: "draft", name: "Draft" },
      { id: "published", name: "Published" },
      { id: "archived", name: "Archived" }
    ],
    defaultStringValue: "draft",
    autoPopulate: false,
    includeInSinglePma: true,
    includeInListPma: true,
    includeInSingleSa: true,
    includeInListSa: true,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "field-4",
    entityDefinitionId: "entity-post-123",
    name: "publishDate",
    label: "Publish Date",
    dbType: "timestamptz",
    type: "date",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 3,
    sectionIndex: 1,
    isOptionTitleField: false,
    required: false,
    searchable: false,
    description: "When to publish this post",
    autoPopulate: false,
    includeInSinglePma: true,
    includeInListPma: true,
    includeInSingleSa: true,
    includeInListSa: true,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "field-5",
    entityDefinitionId: "entity-post-123",
    name: "categoryId",
    label: "Category",
    dbType: "manyToOne",
    type: "select",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 4,
    sectionIndex: 1,
    isOptionTitleField: false,
    required: true,
    requiredText: "Category is required",
    searchable: false,
    filterableInList: true,
    loadOptions: true,
    relatedEntityDefinitionId: "entity-category-123",
    autoPopulate: true,
    includeInSinglePma: true,
    includeInListPma: true,
    includeInSingleSa: true,
    includeInListSa: true,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  
  // Section 2: Media & SEO
  {
    id: "field-6",
    entityDefinitionId: "entity-post-123",
    name: "featuredImage",
    label: "Featured Image",
    dbType: "files",
    type: "image",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 5,
    sectionIndex: 2,
    isOptionTitleField: false,
    required: false,
    searchable: false,
    acceptFileTypes: "image/*",
    maxFileSize: 5000000,
    maxFiles: 1,
    storageBucket: "blog-images",
    useAsPreviewImage: true,
    autoPopulate: false,
    includeInSinglePma: true,
    includeInListPma: true,
    includeInSingleSa: true,
    includeInListSa: true,
    multiLanguage: false,
    isRelationSource: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  }
];
```

---

## Type Guards

### Utility Type Guards

```typescript
// Check if value is valid FieldValue
function isFieldValue(value: unknown): value is FieldValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    (Array.isArray(value) && value.every((v) => typeof v === "string")) ||
    value === null ||
    value === undefined
  );
}

// Check if value is EntityData
function isEntityData(value: unknown): value is Record<string, FieldValue> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Object.values(value).every(isFieldValue);
}

// Get field value with type safety
function getFieldValue<T extends FieldValue>(
  data: Record<string, FieldValue>,
  fieldName: string,
  defaultValue?: T,
): T | undefined {
  const value = data[fieldName];
  return value !== undefined ? (value as T) : defaultValue;
}
```

---

## Summary

This reference covers all main types used in the system. For complete implementation details, refer to:

- **Entity Types:** `src/module/entity-config/types/entity-types.ts`
- **UI Config Types:** `src/module/entity-config/types/ui-config-types.ts`
- **Compiled Specs:** `src/module/entity-config/specs/types.ts`
- **List Types:** `src/module/universal-list/types/list-types.ts`
- **Form Types:** `src/module/form-generation/types.ts`
- **SDK Types:** `src/module/sdk/types/api-types.ts`

---

**Last Updated:** 2026-01-17  
**System Version:** 1.0.0
