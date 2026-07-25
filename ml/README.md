# ml/ — future ML categorizer

Placeholder for a learned transaction categorizer, once enough manually-labeled
transactions accumulate (the `category_locked` flag in the `transactions` table marks
user-confirmed labels — that's the training set).

Planned layout:

```
ml/
├── categorization_model/
├── train.py
└── notebooks/
```

Until then, categorization is rule-based: `server/src/services/categorizer.ts`
(merchant substring rules in the `categorization_rules` table, with Plaid's
`personal_finance_category` as fallback).
