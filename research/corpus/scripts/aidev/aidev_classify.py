# Classify AIDev patch rows that add or remove an exhaustive-deps suppression.
import json, re, sys, os, collections
root = os.path.join(os.path.dirname(__file__), '..')
tag = sys.argv[1] if len(sys.argv) > 1 else 'exhaustive-deps'
recs = []
pages = 0; rows = 0
for l in open(os.path.join(root, 'aidev', f'{tag}-compact.jsonl')):
    j = json.loads(l); pages += 1; rows += j['n']; recs += [dict(r, pr_id=str(r['pr_id'])) for r in j['recs']]
supp = re.compile(r'(eslint-disable|oxlint-disable|biome-ignore)')
BOTS = {'Copilot': 'Copilot', 'copilot-swe-agent[bot]': 'Copilot', 'devin-ai-integration[bot]': 'Devin',
        'google-labs-jules[bot]': 'Jules', 'cursoragent': 'Cursor', 'Cursor Agent': 'Cursor', 'claude': 'Claude Code',
        'Claude': 'Claude Code', 'chatgpt-codex-connector[bot]': 'Codex', 'codex': 'Codex'}
def who(r):
    a, c, m = r.get('author') or '', r.get('committer') or '', r.get('message') or ''
    if a in BOTS: return 'agent-account:' + BOTS[a]
    if re.search(r'Co-Authored-By: Claude|Generated with \[?Claude Code', m, re.I): return 'agent-signature:Claude Code'
    if re.search(r'Co-authored-by: Cursor', m, re.I): return 'agent-signature:Cursor'
    if re.match(r'Merge (branch|pull request|remote)', m): return 'merge'
    return 'other-account'
added = [r for r in recs if any(supp.search(x) for x in r['added'])]
removed = [r for r in recs if any(supp.search(x) for x in r['removed'])]
out = {'pages': pages, 'rows': rows,
       'rows_adding': len(added), 'prs_adding': len({r['pr_id'] for r in added}),
       'rows_removing': len(removed), 'prs_removing': len({r['pr_id'] for r in removed}),
       'adding_by_who': collections.Counter(who(r) for r in added),
       'adding_status': collections.Counter(r['status'] for r in added),
       'added_lines': sum(sum(1 for x in r['added'] if supp.search(x)) for r in added)}
print(json.dumps(out, indent=1, default=dict))
json.dump(sorted({r['pr_id'] for r in added} | {r['pr_id'] for r in removed}), open(os.path.join(root, 'aidev', f'{tag}-prids.json'), 'w'))
