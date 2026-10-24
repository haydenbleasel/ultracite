# Classify added suppression lines naming exhaustive-deps / useExhaustiveDependencies in AIDev agent PRs.
# Usage: python3 -I aidev_classify2.py  -> prints a JSON summary and writes aidev/classified-lines.jsonl
import json, re, os, collections
root = os.path.join(os.path.dirname(__file__), '..')
A = lambda *p: os.path.join(root, 'aidev', *p)
SUPP = re.compile(r'(eslint-disable|oxlint-disable|biome-ignore)')
RULE = re.compile(r'exhaustive-deps|useExhaustiveDependencies')
BOT = {'copilot': 'Copilot', 'copilot-swe-agent[bot]': 'Copilot', 'devin-ai-integration[bot]': 'Devin',
       'google-labs-jules[bot]': 'Jules', 'cursoragent': 'Cursor', 'cursor agent': 'Cursor', 'claude': 'Claude Code'}
AGENT_NAME = {'OpenAI_Codex': 'Codex', 'Copilot': 'Copilot', 'Claude_Code': 'Claude Code', 'Cursor': 'Cursor',
              'Devin': 'Devin', 'Jules': 'Jules', 'Google_Jules': 'Jules'}
def load(tag):
    p = A(f'{tag}-compact.jsonl')
    if not os.path.exists(p): return [], 0, None
    pages = [json.loads(l) for l in open(p)]
    return [r for pg in pages for r in pg['recs']], sum(pg['n'] for pg in pages), {pg.get('total') for pg in pages}
rows = []; meta = {}
for tag in ('exhaustive-deps', 'biome-ued'):
    r, n, totals = load(tag); rows += [dict(x, _tag=tag, pr_id=str(x['pr_id'])) for x in r]; meta[tag] = {'rows_fetched': n, 'totals': sorted(t for t in totals if t) if totals else None}
prs = {}
if os.path.exists(A('prs.jsonl')):
    for l in open(A('prs.jsonl')):
        x = json.loads(l); x['id'] = str(x['id'])
        if x.get('missing') and x['id'] in prs: continue
        prs[x['id']] = x
# de-duplicate rows (same commit, file, PR) across the two queries
seen = set(); uniq = []
for r in rows:
    k = (r['sha'], r['filename'], r['pr_id'])
    if k in seen: continue
    seen.add(k); uniq.append(r)
# removed suppression lines per commit, for carry-over detection
removed_by_commit = collections.defaultdict(set)
for r in uniq:
    for x in r['removed']:
        if SUPP.search(x) and RULE.search(x): removed_by_commit[r['sha']].add(x[1:].strip())
def who(r, pr):
    a = (r.get('author') or '').lower(); m = r.get('message') or ''
    if re.match(r'Merge (branch|pull request|remote-tracking|remote branch)|Merge .* into ', m): return 'merge', None
    if a in BOT: return 'agent account', BOT[a]
    if re.search(r'Co-Authored-By: Claude|Generated with \[?Claude Code', m, re.I): return 'agent signature', 'Claude Code'
    if re.search(r'Co-authored-by: Cursor', m, re.I): return 'agent signature', 'Cursor'
    label = AGENT_NAME.get((pr or {}).get('agent'), (pr or {}).get('agent'))
    if label == 'Codex' and pr and r.get('author') and pr.get('user') and r['author'].lower() == pr['user'].lower():
        return 'Codex PR, PR author\'s identity', 'Codex'
    return 'unattributed', label
lines = []
for r in uniq:
    pr = prs.get(r['pr_id'])
    for x in r['added']:
        if not (SUPP.search(x) and RULE.search(x)): continue
        text = x[1:].strip()
        carried = text in removed_by_commit[r['sha']] or r['status'] == 'renamed'
        cat, agent = who(r, pr)
        repo = None
        if pr and pr.get('html_url'):
            m = re.match(r'https://github.com/([^/]+/[^/]+)/pull/', pr['html_url']); repo = m and m.group(1)
        lines.append({'sha': r['sha'], 'pr_id': r['pr_id'], 'repo': repo, 'pr_agent': (pr or {}).get('agent'), 'pr_state': (pr or {}).get('state'),
                      'merged': bool((pr or {}).get('merged_at')), 'html_url': (pr or {}).get('html_url'), 'author': r['author'], 'file': r['filename'],
                      'status': r['status'], 'line': text, 'carried_over': carried, 'who': cat, 'agent': agent, 'tool': 'biome' if 'biome-ignore' in text else ('oxlint' if 'oxlint-disable' in text else 'eslint'),
                      'msg': (r.get('message') or '')[:120]})
with open(A('classified-lines.jsonl'), 'w') as f:
    for l in lines: f.write(json.dumps(l) + '\n')
new = [l for l in lines if not l['carried_over']]
agentish = [l for l in new if l['who'] in ('agent account', 'agent signature', "Codex PR, PR author's identity")]
C = collections.Counter
summary = {
 'meta': meta, 'unique_rows': len(uniq), 'rows_with_added_suppression': len({(l['sha'], l['file'], l['pr_id']) for l in lines}),
 'pr_labels_known': sum(1 for r in uniq if r['pr_id'] in prs and not prs[r['pr_id']].get('missing')), 'prs_in_rows': len({r['pr_id'] for r in uniq}),
 'added_lines': len(lines), 'carried_over': len(lines) - len(new),
 'new_lines_by_who': C(l['who'] for l in new),
 'agent_written': {'lines': len(agentish), 'prs': len({l['pr_id'] for l in agentish}), 'repos': len({l['repo'] for l in agentish if l['repo']}),
                   'commits': len({l['sha'] for l in agentish}), 'by_agent_lines': C(l['agent'] for l in agentish),
                   'by_agent_prs': C(a for a, _ in {(l['agent'], l['pr_id']) for l in agentish}), 'by_tool': C(l['tool'] for l in agentish),
                   'merged_prs': len({l['pr_id'] for l in agentish if l['merged']}), 'file_status': C(l['status'] for l in agentish)},
 'unattributed_by_pr_agent': C(l['agent'] for l in new if l['who'] == 'unattributed'),
 'merge_lines': sum(1 for l in new if l['who'] == 'merge'),
}
print(json.dumps(summary, indent=1, default=dict))
