---
name: 02-component-composition
description: React component composition patterns — render props, compound components, list rendering with map, slot patterns, and layout primitives
license: MIT
compatibility: opencode
---

# React Component Composition

## List Rendering — Always Use map

**NEVER render lists statically.** Use `Array.map` with proper keys.

```tsx
// ❌ STATIC — hard to maintain, violates DRY
<div>
  <Item name="Alice" />
  <Item name="Bob" />
  <Item name="Carol" />
</div>

// ✅ DYNAMIC — data-driven, composable
<div>
  {users.map((user) => (
    <Item key={user.id} name={user.name} />
  ))}
</div>
```

### Key Rules

- **Use stable IDs** — never array index as key
- **Key at the top level** — on the mapped component, not nested
- **Fragment with key** — when mapping to multiple elements

```tsx
// ❌ index as key — causes reordering bugs
{
  items.map((item, i) => <Item key={i} {...item} />);
}

// ✅ stable id
{
  items.map((item) => <Item key={item.id} {...item} />);
}

// ✅ fragment with key when multiple children
{
  items.map((item) => (
    <React.Fragment key={item.id}>
      <dt>{item.name}</dt>
      <dd>{item.value}</dd>
    </React.Fragment>
  ));
}
```

## Conditional Rendering — Pattern Match

```tsx
// ✅ early return for guard clauses
if (!data) return <Loading />;
if (error) return <Error error={error} />;

// ✅ ternary for binary choice
return isEditing ? <EditForm /> : <DisplayView />;

// ✅ logical AND for simple toggle
return showBanner && <Banner />;

// ✅ record lookup for multiple variants
const variants = {
  idle: <Idle />,
  loading: <Loading />,
  success: <Success data={data} />,
  error: <Error error={error} />,
};
return variants[status];
```

## Compound Components

Group related components that share state implicitly.

```tsx
// Tabs compound component
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="details">Details</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">
    <Overview />
  </Tabs.Content>
  <Tabs.Content value="details">
    <Details />
  </Tabs.Content>
</Tabs>
```

## Render Props / Slots

Allow parent to inject content without prop drilling.

```tsx
// Slot pattern
<Card>
  <Card.Header>
    <h2>Title</h2>
  </Card.Header>
  <Card.Body>
    <p>Content goes here</p>
  </Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>

// Render prop for customization
<DataTable
  data={rows}
  renderRow={(row) => (
    <CustomRow data={row} onSelect={handleSelect} />
  )}
/>
```

## Layout Primitives

Create reusable layout components instead of repeating flex/grid classes.

```tsx
// Stack — vertical spacing
<Stack gap={4}>
  <Item />
  <Item />
  <Item />
</Stack>

// Grid — responsive columns
<Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={4}>
  {items.map((item) => <Card key={item.id} {...item} />)}
</Grid>

// Cluster — horizontal wrapping
<Cluster gap={2}>
  {tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
</Cluster>
```

## Component Boundaries

Split components at data boundaries:

```tsx
// ❌ one giant component
function Page() {
  const [data, setData] = useState();
  const [filter, setFilter] = useState();
  // ... 200 lines of mixed concerns
}

// ✅ separated by concern
function Page() {
  return (
    <PageLayout>
      <FilterBar />
      <DataList />
    </PageLayout>
  );
}

function DataList() {
  const data = useData(); // custom hook
  return (
    <Stack>
      {data.map((item) => (
        <DataCard key={item.id} {...item} />
      ))}
    </Stack>
  );
}
```
