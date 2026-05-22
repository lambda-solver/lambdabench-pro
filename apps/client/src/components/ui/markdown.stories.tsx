import type { Meta, StoryObj } from "@storybook/react";
import { Markdown } from "./markdown";

const meta = {
	component: Markdown,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	title: "UI/Markdown",
	decorators: [
		(Story) => (
			<div className="max-w-prose">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		content: `# Hello Markdown

This is a paragraph with **bold text**, *italic text*, and a [link to the web](https://example.com).

## Subheading

More content here with \`inline code\` and various text styling.`,
	},
};

export const WithCodeBlock: Story = {
	args: {
		content: `Here is a TypeScript function:

\`\`\`typescript
function fibonacci(n: number): number {
	if (n <= 1) return n;
	return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log("Result:", result);
\`\`\`

The function uses recursion to compute the nth Fibonacci number.`,
	},
};

export const WithList: Story = {
	args: {
		content: `## Shopping List

### Unordered items:
- Apples
- Bananas
- Cherries
- Dates

### Steps to follow:
1. Wash all fruits thoroughly
2. Chop the apples and dates
3. Mix everything in a bowl
4. Serve chilled

> **Tip:** Add a squeeze of lemon to prevent browning.`,
	},
};

export const WithBlockquote: Story = {
	args: {
		content: `Markdown is a lightweight markup language for creating formatted text.

> The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks, and then starting on the first one.
>
> — Mark Twain

It was originally created by John Gruber and Aaron Swartz.`,
	},
};

export const LongContent: Story = {
	args: {
		content: `# Comprehensive Markdown Example

## Text Formatting

This demonstrates **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

## Blockquote

> This is a blockquote spanning multiple lines.
> It can contain **nested formatting** and other elements.
>
> — Attributed Author

## Lists

### Grocery list (unordered):
- Dairy
  - Milk
  - Cheese
  - Yogurt
- Produce
  - Apples
  - Bananas
- Bakery
  - Sourdough bread

### Recipe steps (ordered):
1. Preheat the oven to 375°F
2. Mix dry ingredients in a large bowl
   1. Flour
   2. Sugar
   3. Baking powder
3. Combine wet ingredients separately
4. Fold everything together
5. Bake for 25 minutes

## Code Blocks

### JavaScript
\`\`\`javascript
function greet(name) {
	return \`Hello, \${name}!\`;
}

const users = ["Alice", "Bob", "Charlie"];
users.forEach((u) => console.log(greet(u)));
\`\`\`

### Python
\`\`\`python
def factorial(n: int) -> int:
	if n <= 1:
		return 1
	return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

## Tables (GFM)

| Feature      | Status | Notes              |
| ------------ | ------ | ------------------ |
| GFM Tables   | ✅     | Supported          |
| Task Lists   | ✅     | Supported          |
| Auto-links   | ✅     | Supported          |
| Strikethrough| ✅     | Supported          |

## Links

- Visit [GitHub](https://github.com) for hosting
- Read the [documentation](https://docs.example.com)
- Send an email to <hello@example.com>

## Horizontal Rule

---

## Paragraph

This is the last paragraph. It demonstrates how long-form content renders within the component, including the spacing, line height, and typography applied by the Markdown component's custom element overrides. Everything should feel cohesive and readable.`,
	},
};

export const Empty: Story = {
	args: {
		content: "",
	},
};
