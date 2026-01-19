# Usage Guide: Universal List & Form Generation System

This guide explains how to use the universal list and form generation system after migration. For migration instructions, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Table of Contents

1. [Quick Start](#quick-start)
2. [Entity Configuration](#entity-configuration)
3. [Universal List](#universal-list)
4. [Universal Form](#universal-form)
5. [SDK Usage](#sdk-usage)
6. [Field Types](#field-types)
7. [Validation](#validation)
8. [Advanced Features](#advanced-features)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Quick Start

### Basic Workflow

1. **Define your entity** (EntityDefinition + Fields)
2. **SDK compiles configuration** into specs (ListSpec, FormSpec, ValidationSpec)
3. **Use components** to render list and forms automatically

```typescript
// 1. Get compiled configuration from SDK
const compiled = sdk.getCompiledEntityByTableName("products");

// 2. Render list
<UniversalEntityListClient
  listSpec={compiled.list}
  onLoadData={...}
  onDelete={...}
/>

// 3. Render form
<FormRenderer
  sections={compiled.formCreate.sections}
  validationSpec={compiled.validationCreate}
  onSubmit={...}
/>
```

---

## Entity Configuration

### EntityDefinition

The main entity configuration:

```typescript
interface EntityDefinition {
  id: string;
  name: string;                    // Display name: "Product"
  tableName: string;               // Database table: "products"
  description?: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
  
  // Permissions
  createPermission: "ALL" | "User" | "Admin" | "Owner" | ...;
  readPermission: "ALL" | "User" | "Admin" | "Owner" | ...;
  updatePermission: "ALL" | "User" | "Admin" | "Owner" | ...;
  deletePermission: "ALL" | "User" | "Admin" | "Owner" | ...;
  
  // Form sections (0-3)
  titleSection0?: string;  // "General Information"
  titleSection1?: string;  // "Pricing"
  titleSection2?: string;  // "Inventory"
  titleSection3?: string;  // "SEO"
  
  // UI overrides (optional)
  uiConfig?: PartialUIConfig;
  
  // List settings
  enablePagination?: boolean;  // default: true
  pageSize?: number;           // default: 20
  enableFilters?: boolean;     // default: false
  
  // File upload limits
  maxFileSizeMb?: number;      // default: 5
  maxFilesCount?: number;      // default: 10
}
```

### Field Configuration

Each field defines a column/input:

```typescript
interface Field {
  id: string;
  entityDefinitionId: string;
  name: string;              // Field name (e.g., "title", "price")
  label: string;             // Display label: "Product Title"
  
  // Field types
  dbType: DbType;            // Database type
  type: FieldType;           // UI input type
  
  // Visibility
  forCreatePage: boolean;    // Show in create form
  forEditPage: boolean;      // Show in edit form
  forEditPageDisabled: boolean;  // Disabled in edit form
  displayInTable: boolean;   // Show in list table
  
  // Layout
  displayIndex: number;      // Order in form/table
  sectionIndex: number;      // Section (0-3) for forms
  
  // Validation
  required: boolean;
  requiredText?: string;     // Custom error message
  
  // Search & Filter
  searchable: boolean;       // Include in search
  filterableInList?: boolean; // Show as filter in list
  
  // Options (for select fields)
  options?: FieldOption[];
  loadOptions?: boolean;     // Load from API
  
  // Relations
  relatedEntityDefinitionId?: string;
  relationFieldId?: string;
  relationType?: "manyToOne" | "oneToMany" | ...;
  
  // Default values
  defaultStringValue?: string;
  defaultNumberValue?: number;
  defaultBooleanValue?: boolean;
  defaultDateValue?: string;
  
  // Conditional visibility
  foreignKey?: string;       // Depends on field
  foreignKeyValue?: string;  // Show when value matches
  
  // File upload (for file fields)
  acceptFileTypes?: string;  // "image/*", "application/pdf"
  maxFileSize?: number;      // bytes
  maxFiles?: number;         // max files count
  storageBucket?: string;    // "files", "images"
}
```

### Example: Complete Product Entity

```typescript
// EntityDefinition
const productEntity: EntityDefinition = {
  id: "entity-product-123",
  name: "Product",
  tableName: "products",
  type: "primary",
  projectId: "proj-123",
  
  createPermission: "Admin",
  readPermission: "ALL",
  updatePermission: "Admin",
  deletePermission: "Admin",
  
  titleSection0: "General Information",
  titleSection1: "Pricing & Inventory",
  titleSection2: "Media",
  
  enablePagination: true,
  pageSize: 20,
  enableFilters: true,
};

// Fields
const productFields: Field[] = [
  {
    id: "field-1",
    entityDefinitionId: "entity-product-123",
    name: "title",
    label: "Product Title",
    dbType: "varchar",
    type: "text",
    forCreatePage: true,
    forEditPage: true,
    forEditPageDisabled: false,
    displayInTable: true,
    displayIndex: 0,
    sectionIndex: 0,
    required: true,
    requiredText: "Title is required",
    searchable: true,
  },
  {
    id: "field-2",
    entityDefinitionId: "entity-product-123",
    name: "price",
    label: "Price",
    dbType: "float",
    type: "number",
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    displayIndex: 1,
    sectionIndex: 1,
    required: true,
  },
  {
    id: "field-3",
    entityDefinitionId: "entity-product-123",
    name: "image",
    label: "Product Image",
    dbType: "files",
    type: "image",
    forCreatePage: true,
    forEditPage: true,
    displayInTable: true,
    displayIndex: 2,
    sectionIndex: 2,
    required: false,
    acceptFileTypes: "image/*",
    maxFileSize: 5000000, // 5MB
    maxFiles: 1,
  },
];
```

---

## Universal List

### Basic Usage

```typescript
import { UniversalEntityListClient } from "@src/module/universal-list";
import { useSDK } from "@src/components/providers/SDKProvider";

function ProductsListPage() {
  const { sdk } = useSDK();
  
  // Get compiled configuration
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  // Data loading function
  const onLoadData = async (params) => {
    const result = await sdk.getInstances(compiled.entityDefinitionId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      filters: params.filters,
    });
    
    return {
      data: result.data,
      pagination: result.pagination,
    };
  };
  
  // Delete function
  const onDelete = async (id: string) => {
    await sdk.deleteInstance(compiled.entityDefinitionId, id);
  };
  
  return (
    <UniversalEntityListClient
      projectId="proj-123"
      serviceType="entity-instance"
      listSpec={compiled.list}
      routing={{
        createUrlTemplate: "/products/new",
        editUrlTemplate: "/products/{instanceId}",
        detailsUrlTemplate: "/products/{instanceId}",
      }}
      onLoadData={onLoadData}
      onDelete={onDelete}
    />
  );
}
```

### List Props

```typescript
interface UniversalEntityListClientProps<TData extends { id: string }> {
  // Required
  projectId: string;              // Project ID
  serviceType: ServiceType;       // "entity-instance" | "admin" | ...
  listSpec: ListSpec;             // From compiled config
  routing: RoutingConfig;         // URL templates
  onLoadData: LoadDataFn<TData>;  // Data loading function
  onDelete: (id: string) => Promise<void>;  // Delete function
  
  // Optional
  readOnly?: boolean;             // Hide create/delete buttons (default: false)
}
```

### Routing Configuration

```typescript
interface RoutingConfig {
  createUrlTemplate: string;    // "/products/new"
  editUrlTemplate: string;      // "/products/{instanceId}"
  detailsUrlTemplate: string;   // "/products/{instanceId}"
}

// Placeholders:
// {projectId} - replaced with projectId
// {instanceId} - replaced with instance ID
```

### Load Data Function

```typescript
type LoadDataFn<TData> = (
  params: LoadParams,
  signal?: AbortSignal
) => Promise<LoadDataResult<TData>>;

interface LoadParams {
  page: number;                  // Current page (starts from 1)
  limit: number;                 // Page size
  search?: string;               // Search query
  filters?: Record<string, string[]>;  // Field filters
  filterModes?: Record<string, FilterMode>;  // Filter modes
  sortBy?: string;               // Sort field (future)
  sortOrder?: "asc" | "desc";    // Sort direction
}

interface LoadDataResult<TData> {
  data: TData[];
  pagination: PaginationInfo;
}
```

### Features

#### Pagination

Automatic pagination with URL sync:
```typescript
// URL: /products?page=2&limit=20
```

#### Search

Search across all `searchable` fields:
```typescript
// URL: /products?search=laptop
```

#### Filters

Filter by specific fields:
```typescript
// URL: /products?category=electronics&status=active
```

#### Read-only Mode

Disable create/delete actions:
```typescript
<UniversalEntityListClient
  {...props}
  readOnly={true}
/>
```

---

## Universal Form

### Basic Usage (Create)

```typescript
import { FormRenderer } from "@src/module/form-generation";

function ProductCreatePage() {
  const { sdk } = useSDK();
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  const onSubmit = async (data: FormData) => {
    await sdk.createInstance(compiled.entityDefinitionId, data);
    toast.success("Product created!");
    navigate("/products");
  };
  
  const onCancel = () => {
    navigate("/products");
  };
  
  return (
    <FormRenderer
      sections={compiled.formCreate.sections}
      validationSpec={compiled.validationCreate}
      mode="create"
      onSubmit={onSubmit}
      onCancel={onCancel}
      formUi={compiled.formCreate.ui}
      formMessages={compiled.formCreate.messages}
    />
  );
}
```

### Edit Form with Data Loading

```typescript
function ProductEditPage() {
  const { id } = useParams();
  const { sdk } = useSDK();
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  // Load existing data
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => sdk.getInstance(compiled.entityDefinitionId, id!),
  });
  
  const onSubmit = async (data: FormData) => {
    await sdk.updateInstance(compiled.entityDefinitionId, id!, data);
    toast.success("Product updated!");
  };
  
  const onDelete = async () => {
    await sdk.deleteInstance(compiled.entityDefinitionId, id!);
    toast.success("Product deleted!");
    navigate("/products");
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <FormRenderer
      sections={compiled.formEdit.sections}
      validationSpec={compiled.validationEdit}
      mode="edit"
      initialData={product}
      onSubmit={onSubmit}
      onDelete={onDelete}
      formUi={compiled.formEdit.ui}
      formMessages={compiled.formEdit.messages}
      entityInstanceId={id}
      itemName={product.title}
    />
  );
}
```

### Form Props

```typescript
interface FormRendererProps {
  // Required
  sections: FormSectionSpec[];     // From compiled config
  validationSpec: ValidationSpec;  // From compiled config
  mode: "create" | "edit";
  onSubmit: (data: FormData) => Promise<void>;
  formUi: FormUiSpec;              // UI labels/titles
  formMessages: FormMessagesSpec;  // Success/error messages
  
  // Optional
  initialData?: Record<string, FieldValue>;  // For edit mode
  onCancel?: () => void;
  onDelete?: () => Promise<void>;  // For edit mode
  submitButtonText?: string;       // Override button text
  cancelButtonText?: string;
  itemName?: string;               // For delete confirmation
  entityInstanceId?: string;       // For file uploads
  readOnly?: boolean;              // Disable all inputs
}
```

### Sections

Forms are organized into sections (0-3):

```typescript
// Section titles from EntityDefinition
const entityDefinition = {
  titleSection0: "General Information",
  titleSection1: "Pricing & Inventory",
  titleSection2: "Media & Assets",
  titleSection3: "Advanced Options",
};

// Compiled into FormSectionSpec
interface FormSectionSpec {
  id: number;           // 0, 1, 2, 3
  title: string;        // Section title
  controls: FormFieldSpec[];  // Fields in this section
  action?: {            // Delete action (edit mode only)
    action: "delete";
    title: string;
    options?: {...};
  };
}
```

### Conditional Fields

Fields can depend on other field values:

```typescript
// Field example: "description" shown only when "type" = "physical"
{
  name: "description",
  foreignKey: "type",           // Depends on "type" field
  foreignKeyValue: "physical",  // Show when type = "physical"
}

// Multiple values (OR logic)
{
  name: "weight",
  foreignKey: "type",
  foreignKeyValue: "physical|fragile",  // Show when type = "physical" OR "fragile"
}

// Any value
{
  name: "notes",
  foreignKey: "type",
  foreignKeyValue: "any",  // Show when type has any value
}
```

---

## SDK Usage

### Initialization

```typescript
import { createSDK } from "@src/module/sdk";

const sdk = await createSDK({
  apiUrl: "https://api.example.com",
  appMode: "developer",
  projectId: "proj-123",
  token: "your-jwt-token",
  fetchToken: async () => {
    // Refresh token logic
    const newToken = await refreshAuthToken();
    return newToken;
  },
  options: {
    preloadConfigs: true,  // Load all configs on init (recommended)
  },
});
```

### Configuration Methods (Synchronous)

All configuration methods work synchronously from memory:

```typescript
// Get all entity definitions
const allEntities = sdk.getAllEntityDefinitions();

// Get entity by ID
const config = sdk.getEntityDefinitionConfig("entity-123");
// Returns: { entityDefinition, fields }

// Get entity by tableName
const config = sdk.getEntityDefinitionByTableName("products");

// Get compiled specs (RECOMMENDED)
const compiled = sdk.getCompiledEntityByTableName("products");
// Returns: { list, formCreate, formEdit, validationCreate, validationEdit }

// Get all table names
const tableNames = sdk.getAllTableNames();
// Returns: ["products", "categories", "tags", ...]

// Get entities metadata
const metadata = sdk.getAllEntitiesMetadata();
// Returns: [{ id, name, tableName }, ...]
```

### CRUD Operations (Async)

```typescript
// Get list with pagination
const result = await sdk.getInstances("entity-123", {
  page: 1,
  limit: 20,
  search: "laptop",
  filters: { category: ["electronics"] },
});
// Returns: { data: EntityInstance[], pagination: PaginationInfo }

// Get all instances (no pagination)
const all = await sdk.getAllInstances("entity-123");
// Returns: EntityInstance[]

// Get single instance
const instance = await sdk.getInstance("entity-123", "instance-456");
// Returns: EntityInstance

// Create instance
const created = await sdk.createInstance("entity-123", {
  title: "New Product",
  price: 99.99,
  // ... other fields
});

// Update instance
const updated = await sdk.updateInstance("entity-123", "instance-456", {
  price: 79.99,  // Only changed fields
});

// Delete instance
await sdk.deleteInstance("entity-123", "instance-456");
```

### Proxy Services (Simplified API)

Use tableName instead of entityDefinitionId:

```typescript
// Get service for entity
const productsService = sdk.universalService.getEntityService("products");

// With TypeScript types
interface Product {
  id: string;
  title: string;
  price: number;
}
const productsService = sdk.universalService.getEntityService<Product>("products");

// Use service methods
const { data, pagination } = await productsService.getAll({ page: 1, limit: 20 });
const allProducts = await productsService.getAllInstances();
const product = await productsService.getById("product-123");
const created = await productsService.create({ title: "New", price: 99 });
const updated = await productsService.update("product-123", { price: 79 });
await productsService.delete("product-123");

// Get config
const config = productsService.getConfig();
```

### Error Handling

```typescript
import { 
  NotFoundError, 
  AuthenticationError, 
  PermissionDeniedError,
  ValidationError 
} from "@src/module/sdk";

try {
  await sdk.getInstance("entity-123", "instance-456");
} catch (error) {
  if (error instanceof NotFoundError) {
    toast.error("Item not found");
  } else if (error instanceof AuthenticationError) {
    // Redirect to login
    navigate("/login");
  } else if (error instanceof PermissionDeniedError) {
    toast.error("Access denied");
  } else if (error instanceof ValidationError) {
    toast.error("Invalid data");
  } else {
    toast.error("An error occurred");
  }
}
```

---

## Field Types

### Text Fields

```typescript
// Text input
{
  dbType: "varchar",
  type: "text",
  placeholder: "Enter product name",
}

// Textarea
{
  dbType: "varchar",
  type: "textarea",
  placeholder: "Enter description",
}

// Email
{
  dbType: "varchar",
  type: "email",
}

// Password
{
  dbType: "varchar",
  type: "password",
}

// Color picker
{
  dbType: "varchar",
  type: "color",
  defaultStringValue: "#000000",
}
```

### Number Fields

```typescript
{
  dbType: "float",
  type: "number",
  placeholder: "0.00",
  defaultNumberValue: 0,
}
```

### Boolean Fields

```typescript
{
  dbType: "boolean",
  type: "switch",  // or "boolean"
  defaultBooleanValue: false,
}
```

### Date Fields

```typescript
{
  dbType: "timestamptz",
  type: "date",
  defaultDateValue: "2024-01-01",
}
```

### Select Fields

```typescript
// Static options
{
  dbType: "varchar",
  type: "select",
  options: [
    { id: "1", name: "Option 1" },
    { id: "2", name: "Option 2" },
  ],
}

// Multiple select
{
  dbType: "varchar",
  type: "multipleSelect",
  options: [...],
}
```

### Relation Fields

```typescript
// Many-to-one (single select)
{
  dbType: "manyToOne",
  type: "select",
  relatedEntityDefinitionId: "entity-category-123",
  loadOptions: true,  // Load from API
}

// One-to-many (multiple select)
{
  dbType: "oneToMany",
  type: "multipleSelect",
  relatedEntityDefinitionId: "entity-tags-123",
  loadOptions: true,
}

// Many-to-many
{
  dbType: "manyToMany",
  type: "multipleSelect",
  relatedEntityDefinitionId: "entity-products-123",
  loadOptions: true,
}

// One-to-one
{
  dbType: "oneToOne",
  type: "select",
  relatedEntityDefinitionId: "entity-profile-123",
  loadOptions: true,
}
```

### File Fields

```typescript
// Single image
{
  dbType: "files",
  type: "image",
  acceptFileTypes: "image/*",
  maxFileSize: 5000000,  // 5MB in bytes
  maxFiles: 1,
  storageBucket: "product-images",
}

// Multiple images
{
  dbType: "files",
  type: "images",
  acceptFileTypes: "image/*",
  maxFileSize: 5000000,
  maxFiles: 10,
}

// Single file
{
  dbType: "files",
  type: "file",
  acceptFileTypes: "application/pdf,.doc,.docx",
  maxFileSize: 10000000,  // 10MB
  maxFiles: 1,
}

// Multiple files
{
  dbType: "files",
  type: "files",
  acceptFileTypes: "*",
  maxFiles: 5,
}
```

### Array Fields

```typescript
{
  dbType: "varchar",  // Stored as JSON array
  type: "array",
  placeholder: "Add item",
  arrayEmptyText: "No items added",
}
```

### Dynamic Value Fields

Fields that change type based on another field:

```typescript
// Type field
{
  name: "valueType",
  dbType: "varchar",
  type: "select",
  options: [
    { id: "text", name: "Text" },
    { id: "number", name: "Number" },
    { id: "boolean", name: "Boolean" },
  ],
}

// Dynamic value field
{
  name: "value",
  dbType: "varchar",
  type: "dynamicValue",
  typeFieldName: "valueType",  // Depends on valueType field
}
```

---

## Validation

### Field-level Validation

```typescript
{
  name: "email",
  type: "email",
  required: true,
  requiredText: "Email is required",
}

{
  name: "age",
  type: "number",
  required: true,
  minValueText: "Age must be at least 18",  // Custom message
  maxValueText: "Age must be less than 100",
}
```

### Conditional Validation

Fields validated only when visible:

```typescript
{
  name: "weight",
  required: true,
  foreignKey: "type",
  foreignKeyValue: "physical",
  // Weight is required only when type = "physical"
}
```

### Validation Schema

Automatically generated from `ValidationSpec`:

```typescript
import { createSchemaFromValidationSpec } from "@src/module/form-generation";

const schema = createSchemaFromValidationSpec(validationSpec);
// Returns: Yup schema object
```

### Custom Validation (Future)

For custom validation logic, you can extend the validation schema:

```typescript
import * as yup from "yup";

const customSchema = schema.shape({
  password: yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain uppercase letter"),
  confirmPassword: yup.string()
    .oneOf([yup.ref("password")], "Passwords must match"),
});
```

---

## Advanced Features

### Filtering

#### Static Filters

Filter by predefined options:

```typescript
{
  name: "status",
  type: "select",
  filterableInList: true,  // Show in list filters
  options: [
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
  ],
}
```

#### Relation Filters

Filter by related entities:

```typescript
{
  name: "category",
  dbType: "manyToOne",
  type: "select",
  relatedEntityDefinitionId: "entity-category-123",
  filterableInList: true,  // Show in list filters
  loadOptions: true,
}
```

### Sorting (Future)

```typescript
const result = await sdk.getInstances("entity-123", {
  sortBy: "createdAt",
  sortOrder: "desc",
});
```

### Custom Columns

Override default column generation:

```typescript
import { generateColumnsFromConfig } from "@src/module/universal-list/utils";

const columns = generateColumnsFromConfig(
  listSpec.columns,
  onEdit,
  onDelete,
  onLink,
  readOnly,
);

// Add custom column
columns.push({
  id: "custom",
  header: "Custom",
  cell: ({ row }) => {
    return <CustomComponent data={row.original} />;
  },
});
```

### File Upload with Progress

```typescript
// In InputFile component
<FileUpload
  value={fileValue}
  onChange={handleFileChange}
  accept="image/*"
  maxSize={5000000}
  maxFiles={1}
  onProgress={(progress) => {
    console.log(`Upload progress: ${progress}%`);
  }}
/>
```

### Multi-language Support (Future)

```typescript
{
  name: "title",
  multiLanguage: true,
  // Will create title_en, title_es, title_fr, etc.
}
```

---

## Best Practices

### 1. Use Compiled Configs

Always use compiled configs from SDK:

```typescript
// ✅ Good
const compiled = sdk.getCompiledEntityByTableName("products");
<UniversalEntityListClient listSpec={compiled.list} />

// ❌ Bad
const config = sdk.getEntityDefinitionConfig("entity-123");
<UniversalEntityListClient listSpec={manuallyBuildSpec(config)} />
```

### 2. Handle Loading States

```typescript
function ProductsPage() {
  const { sdk, isLoading } = useSDK();
  
  if (isLoading) {
    return <Skeleton />;
  }
  
  const compiled = sdk.getCompiledEntityByTableName("products");
  // ... render list
}
```

### 3. Use Proxy Services

Simpler API with tableName:

```typescript
// ✅ Good
const service = sdk.universalService.getEntityService("products");
const data = await service.getAll();

// ❌ Verbose
const config = sdk.getEntityDefinitionByTableName("products");
const data = await sdk.getInstances(config.entityDefinition.id);
```

### 4. Memoize Callbacks

Prevent unnecessary re-renders:

```typescript
const onLoadData = useCallback(async (params) => {
  return await sdk.getInstances(entityId, params);
}, [sdk, entityId]);

const onDelete = useCallback(async (id: string) => {
  await sdk.deleteInstance(entityId, id);
}, [sdk, entityId]);
```

### 5. Error Handling

Always handle errors gracefully:

```typescript
const onSubmit = async (data: FormData) => {
  try {
    await sdk.createInstance(entityId, data);
    toast.success("Created successfully!");
    navigate("/list");
  } catch (error) {
    if (error instanceof ValidationError) {
      toast.error("Please check your input");
    } else {
      toast.error("Failed to create item");
    }
    console.error(error);
  }
};
```

### 6. Optimize Pagination

Use appropriate page sizes:

```typescript
// For large datasets
enablePagination: true,
pageSize: 50,  // or 100

// For small datasets
enablePagination: false,  // Load all at once
```

### 7. Use Read-only Mode

For view-only pages:

```typescript
<UniversalEntityListClient
  {...props}
  readOnly={true}  // Hide create/delete buttons
/>

<FormRenderer
  {...props}
  readOnly={true}  // Disable all inputs
/>
```

### 8. Organize Sections

Group related fields logically:

```typescript
// Section 0: Essential fields (always shown)
titleSection0: "General Information"

// Section 1: Important but optional
titleSection1: "Pricing & Inventory"

// Section 2: Media and assets
titleSection2: "Media"

// Section 3: Advanced/rarely used
titleSection3: "Advanced Options"
```

---

## API Reference

### SDK Methods

```typescript
// Configuration (sync)
sdk.getEntityDefinitionConfig(id: string): EntityDefinitionConfig | undefined
sdk.getEntityDefinitionByTableName(tableName: string): EntityDefinitionConfig | undefined
sdk.getCompiledEntityByTableName(tableName: string): CompiledEntityConfig | undefined
sdk.getAllEntityDefinitions(): EntityDefinition[]
sdk.getAllTableNames(): string[]
sdk.getAllEntitiesMetadata(): EntityMetadata[]

// CRUD (async)
sdk.getInstances(entityId: string, params?: GetInstancesOptions): Promise<ListResponse>
sdk.getAllInstances(entityId: string, params?: GetInstancesOptions): Promise<EntityInstance[]>
sdk.getInstance(entityId: string, instanceId: string): Promise<EntityInstance>
sdk.createInstance(entityId: string, data: InstanceData): Promise<EntityInstance>
sdk.updateInstance(entityId: string, instanceId: string, data: Partial<InstanceData>): Promise<EntityInstance>
sdk.deleteInstance(entityId: string, instanceId: string): Promise<void>

// Proxy Services
sdk.universalService.getEntityService<T>(tableName: string): EntityService<T>
```

### Universal List Hooks

```typescript
// Parameter management
useListParams({ projectId, serviceType, pageSize }): {
  params: LoadParams;
  setParams: (updates: Partial<LoadParams>) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
}

// Data loading
useListQuery<TData>({ projectId, serviceType, params, onLoadData }): {
  data: TData[];
  pagination: PaginationInfo;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

// Routing
useListRouting({ routing, projectId }): {
  getCreateUrl: () => string;
  getEditUrl: (instanceId: string) => string;
  getDetailsUrl: (instanceId: string, additionalUrl?: string) => string;
  navigateToCreate: (params?: { returnLimit?: number }) => void;
  navigateToEdit: (instanceId: string) => void;
  navigateToDetails: (instanceId: string, additionalUrl?: string) => void;
}

// UI state
useListState({ data, isLoading, isFetching, error, params, searchInput }): {
  isInitialLoading: boolean;
  isEmpty: boolean;
  isFilteredEmpty: boolean;
  hasData: boolean;
  hasError: boolean;
  errorMessage: string;
  isRefreshing: boolean;
}
```

### Form Utilities

```typescript
// Validation
createSchemaFromValidationSpec(validationSpec: ValidationSpec): yup.ObjectSchema

// Data preparation
prepareInitialFormData(fields: FormFieldSpec[], initialData: any, mode: "create" | "edit"): FormData

// Data cleaning
cleanFormDataForSubmit(data: FormData, touchedFields: Set<string>, mode: "create" | "edit"): FormData

// Section utilities
getAllFieldsFromSections(sections: FormSectionSpec[]): FormFieldSpec[]
filterVisibleSections(sections: FormSectionSpec[], formData: FormData): FormSectionSpec[]
```

---

## Examples

### Complete CRUD Implementation

```typescript
// List Page
function ProductsListPage() {
  const { sdk } = useSDK();
  const navigate = useNavigate();
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  return (
    <UniversalEntityListClient
      projectId="proj-123"
      serviceType="entity-instance"
      listSpec={compiled.list}
      routing={{
        createUrlTemplate: "/products/new",
        editUrlTemplate: "/products/{instanceId}",
        detailsUrlTemplate: "/products/{instanceId}",
      }}
      onLoadData={async (params) => {
        return await sdk.getInstances(compiled.entityDefinitionId, params);
      }}
      onDelete={async (id) => {
        await sdk.deleteInstance(compiled.entityDefinitionId, id);
        toast.success("Product deleted!");
      }}
    />
  );
}

// Create Page
function ProductCreatePage() {
  const { sdk } = useSDK();
  const navigate = useNavigate();
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  return (
    <FormRenderer
      sections={compiled.formCreate.sections}
      validationSpec={compiled.validationCreate}
      mode="create"
      onSubmit={async (data) => {
        await sdk.createInstance(compiled.entityDefinitionId, data);
        toast.success("Product created!");
        navigate("/products");
      }}
      onCancel={() => navigate("/products")}
      formUi={compiled.formCreate.ui}
      formMessages={compiled.formCreate.messages}
    />
  );
}

// Edit Page
function ProductEditPage() {
  const { id } = useParams();
  const { sdk } = useSDK();
  const navigate = useNavigate();
  const compiled = sdk.getCompiledEntityByTableName("products");
  
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => sdk.getInstance(compiled.entityDefinitionId, id!),
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <FormRenderer
      sections={compiled.formEdit.sections}
      validationSpec={compiled.validationEdit}
      mode="edit"
      initialData={data}
      onSubmit={async (formData) => {
        await sdk.updateInstance(compiled.entityDefinitionId, id!, formData);
        toast.success("Product updated!");
        navigate("/products");
      }}
      onDelete={async () => {
        await sdk.deleteInstance(compiled.entityDefinitionId, id!);
        toast.success("Product deleted!");
        navigate("/products");
      }}
      onCancel={() => navigate("/products")}
      formUi={compiled.formEdit.ui}
      formMessages={compiled.formEdit.messages}
      entityInstanceId={id}
      itemName={data.title}
    />
  );
}
```

---

## Conclusion

You now have a complete understanding of the universal list and form generation system. For implementation details, refer to the source code and individual module README files.

**Additional Resources:**
- [Migration Guide](./MIGRATION_GUIDE.md)
- [SDK README](../src/module/sdk/README.md)
- [Universal List README](../src/module/universal-list/README.md)
- [Form Generation README](../src/module/form-generation/README.md)
- [Entity Workflow](./ENTITY_WORKFLOW.md)

**Support:**
For questions or issues, please refer to the project documentation or contact the development team.
