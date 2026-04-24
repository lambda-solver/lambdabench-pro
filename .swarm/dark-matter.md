## Dark Matter: Hidden Couplings

Found 4 file pairs that frequently co-change but have no import relationship:

| File A | File B | NPMI | Co-Changes | Lift |
|--------|--------|------|------------|------|
| apps/client/src/app.tsx | apps/client/src/components/theme-toggle.tsx | 1.000 | 3 | 6.67 |
| apps/client/src/components/leaderboard/BarChart.tsx | apps/client/src/components/leaderboard/VimLine.tsx | 1.000 | 3 | 6.67 |
| apps/client/src/app.tsx | apps/client/src/components/leaderboard/TabLine.tsx | 0.848 | 3 | 5.00 |
| apps/client/src/components/leaderboard/TabLine.tsx | apps/client/src/components/theme-toggle.tsx | 0.848 | 3 | 5.00 |

These pairs likely share an architectural concern invisible to static analysis.
Consider adding explicit documentation or extracting the shared concern.