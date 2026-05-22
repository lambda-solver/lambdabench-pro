import type { BenchmarkData, BenchmarkTask, Ranking } from "@repo/domain/Benchmark";

// ---------------------------------------------------------------------------
// BenchmarkTask fixtures
// ---------------------------------------------------------------------------

export const taskClstMap: BenchmarkTask = {
	category: "encoding",
	categoryName: "Encoding",
	description: "Implement a function that maps over church-encoded lists.",
	id: "clst_map",
	testCount: 6,
	tests: [
		{ input: "\\f.\\x.f (f x)", expected: "\\f.\\x.f (f x)" },
		{ input: "\\f.\\x.x", expected: "\\f.\\x.x" },
	],
};

export const taskClstRev: BenchmarkTask = {
	category: "encoding",
	categoryName: "Encoding",
	description: "Reverse a church-encoded list using fold.",
	id: "clst_rev",
	testCount: 6,
	tests: [
		{ input: "\\f.\\x.f a (f b x)", expected: "\\f.\\x.f b (f a x)" },
	],
};

export const taskCnatAdd: BenchmarkTask = {
	category: "arithmetic",
	categoryName: "Arithmetic",
	description: "Implement addition of two church numerals.",
	id: "cnat_add",
	testCount: 8,
	tests: [
		{ input: "\\f.\\x.f (f x)", expected: "\\f.\\x.f (f (f (f (f x))))" },
		{ input: "\\f.\\x.x", expected: "\\f.\\x.f x" },
	],
};

export const taskCnatMul: BenchmarkTask = {
	category: "arithmetic",
	categoryName: "Arithmetic",
	description: "Implement multiplication of two church numerals.",
	id: "cnat_mul",
	testCount: 8,
	tests: [
		{ input: "\\f.\\x.f (f x)", expected: "\\f.\\x.f (f (f (f x)))" },
	],
};

export const taskSbinAdd: BenchmarkTask = {
	category: "binary",
	categoryName: "Binary Operations",
	description: "Implement binary addition of two church-encoded binary numbers.",
	id: "sbin_add",
	testCount: 8,
	tests: [
		{ input: "True", expected: "False" },
	],
};

export const taskSnatAdd: BenchmarkTask = {
	category: "binary",
	categoryName: "Binary Operations",
	description: "Implement addition of two binary church numerals using successor.",
	id: "snat_add",
	testCount: 6,
	tests: [
		{ input: "0", expected: "\\s.\\z.s z" },
	],
};

export const allTasks: ReadonlyArray<BenchmarkTask> = [
	taskClstMap,
	taskClstRev,
	taskCnatAdd,
	taskCnatMul,
	taskSbinAdd,
	taskSnatAdd,
];

// ---------------------------------------------------------------------------
// Ranking fixtures
// ---------------------------------------------------------------------------

export const rankingGemini: Ranking = {
	model: "openrouter/google/gemini-2.5-pro",
	right: 5,
	total: 6,
	pct: "83.3",
	avgTime: 8.2,
	timestamp: "2026y05m17d.09h00m00s",
	tasks: {
		clst_map: true,
		clst_rev: false,
		cnat_add: true,
		cnat_mul: true,
		sbin_add: true,
		snat_add: true,
	},
	taskBits: {
		cnat_add: 28,
		cnat_mul: 24,
		sbin_add: 18,
		snat_add: 22,
		clst_map: 15,
	},
	taskRefs: {
		cnat_add: 32,
		cnat_mul: 30,
		sbin_add: 22,
		snat_add: 28,
		clst_map: 20,
	},
	pricePerMOutputTokens: 10.0,
};

export const rankingClaude: Ranking = {
	model: "openrouter/anthropic/claude-sonnet-4",
	right: 5,
	total: 6,
	pct: "83.3",
	avgTime: 12.5,
	timestamp: "2026y05m17d.09h05m00s",
	tasks: {
		clst_map: true,
		clst_rev: true,
		cnat_add: true,
		cnat_mul: true,
		sbin_add: false,
		snat_add: true,
	},
	taskBits: {
		cnat_add: 30,
		cnat_mul: 28,
		snat_add: 25,
		clst_map: 18,
		clst_rev: 22,
	},
	taskRefs: {
		cnat_add: 32,
		cnat_mul: 30,
		sbin_add: 22,
		snat_add: 28,
		clst_map: 20,
		clst_rev: 28,
	},
	pricePerMOutputTokens: 15.0,
};

export const rankingGPT: Ranking = {
	model: "openrouter/openai/gpt-4o",
	right: 4,
	total: 6,
	pct: "66.7",
	avgTime: 5.1,
	timestamp: "2026y05m17d.09h10m00s",
	tasks: {
		clst_map: true,
		clst_rev: true,
		cnat_add: true,
		cnat_mul: false,
		sbin_add: false,
		snat_add: true,
	},
	taskBits: {
		cnat_add: 32,
		clst_map: 16,
		clst_rev: 20,
		snat_add: 26,
	},
	taskRefs: {
		cnat_add: 32,
		clst_map: 20,
		clst_rev: 28,
		snat_add: 28,
	},
	pricePerMOutputTokens: 5.0,
};

export const rankingClaudeRlm: Ranking = {
	model: "openrouter/anthropic/claude-sonnet-4/rlm",
	right: 6,
	total: 6,
	pct: "100.0",
	avgTime: 45.2,
	timestamp: "2026y05m17d.09h15m00s",
	tasks: {
		clst_map: true,
		clst_rev: true,
		cnat_add: true,
		cnat_mul: true,
		sbin_add: true,
		snat_add: true,
	},
	taskBits: {
		cnat_add: 28,
		cnat_mul: 24,
		sbin_add: 18,
		snat_add: 22,
		clst_map: 15,
		clst_rev: 20,
	},
	taskRefs: {
		cnat_add: 32,
		cnat_mul: 30,
		sbin_add: 22,
		snat_add: 28,
		clst_map: 20,
		clst_rev: 28,
	},
	pricePerMOutputTokens: 15.0,
	rlm: true,
	rlmDepth: 3,
	rlmAttempts: 24,
};

export const allRankings: ReadonlyArray<Ranking> = [
	rankingGemini,
	rankingClaude,
	rankingGPT,
	rankingClaudeRlm,
];

// ---------------------------------------------------------------------------
// BenchmarkData fixtures
// ---------------------------------------------------------------------------

export const leaderboardData: BenchmarkData = {
	categories: [
		{ id: "all", name: "All" },
		{ id: "encoding", name: "Encoding" },
		{ id: "arithmetic", name: "Arithmetic" },
		{ id: "binary", name: "Binary Operations" },
	],
	generatedAt: "2026-05-17T09:15:00.000Z",
	rankings: [...allRankings],
	tasks: [...allTasks],
};

export const benchmarkFixtures = [
	{ name: "Default Leaderboard", data: leaderboardData },
] as const;
