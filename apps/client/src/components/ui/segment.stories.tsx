import type { ChatResponse, MessageSegment } from "@repo/domain/Chat";
import type { Meta, StoryObj } from "@storybook/react";
import { Segment, TokenUsage, ToolCall } from "./segment";

const completeSegment = {
	_tag: "tool-call",
	tool: {
		arguments: {},
		argumentsText: "",
		id: "tool-1",
		name: "calculate_sum",
		result: "42",
		status: "complete",
		success: true,
	},
} as MessageSegment & { _tag: "tool-call" };

const executingSegment = {
	_tag: "tool-call",
	tool: {
		arguments: {},
		argumentsText: "",
		id: "tool-2",
		name: "search_documents",
		result: undefined,
		status: "executing",
		success: undefined,
	},
} as MessageSegment & { _tag: "tool-call" };

const failedSegment = {
	_tag: "tool-call",
	tool: {
		arguments: { filters: { year: 2024 } },
		argumentsText: JSON.stringify({ filters: { year: 2024 } }),
		id: "tool-3",
		name: "fetch_weather",
		result: undefined,
		status: "failed",
		success: false,
	},
} as MessageSegment & { _tag: "tool-call" };

const proposedSegment = {
	_tag: "tool-call",
	tool: {
		arguments: {},
		argumentsText: "",
		id: "tool-4",
		name: "generate_chart",
		result: undefined,
		status: "proposed",
		success: undefined,
	},
} as MessageSegment & { _tag: "tool-call" };

const usageResponse = {
	_tag: "complete",
	finishReason: "stop",
	segments: [],
	usage: {
		completionTokens: 89,
		promptTokens: 145,
		totalTokens: 234,
	},
} as ChatResponse & { _tag: "complete" };

const meta = {
	component: Segment,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "UI/Segment",
} satisfies Meta<typeof Segment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToolCallComplete: Story = {
	render: () => <ToolCall segment={completeSegment} />,
};

export const ToolCallExecuting: Story = {
	render: () => <ToolCall segment={executingSegment} />,
};

export const ToolCallFailed: Story = {
	render: () => <ToolCall segment={failedSegment} />,
};

export const ToolCallProposed: Story = {
	render: () => <ToolCall segment={proposedSegment} />,
};

export const TokenUsageDefault: Story = {
	render: () => <TokenUsage response={usageResponse} />,
};

export const SegmentWrapper: Story = {
	render: () => (
		<Segment className="w-96">
			<ToolCall segment={completeSegment} />
			<TokenUsage response={usageResponse} />
		</Segment>
	),
};
