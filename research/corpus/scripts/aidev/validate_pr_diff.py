# Validate a seeded sample of attributed suppression lines against each PR's base-to-head diff on GitHub
# (read-only `gh api repos/{repo}/pulls/{n}/files`). A line counts as new if it is added to that file in the
# PR diff and the same text is not removed anywhere in the PR diff.
import json, os, random, subprocess, collections, sys
root = os.path.join(os.path.dirname(__file__), '..')
L = [json.loads(l) for l in open(os.path.join(root, 'aidev', 'classified-lines.jsonl'))]
ATTR = ('agent account', 'agent signature', "Codex PR, PR author's identity")
TOOLS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['eslint', 'oxlint']
OUT = sys.argv[2] if len(sys.argv) > 2 else 'pr-diff-validation.json'
pool = [l for l in L if not l['carried_over'] and l['who'] in ATTR and l.get('html_url') and l['tool'] in TOOLS]
random.seed(20261024)
by = collections.defaultdict(list)
for l in pool: by[l['agent']].append(l)
quota = {'Claude Code': 20, 'Codex': 12, 'Copilot': 8, 'Cursor': 8, 'Devin': 4, 'Jules': 4}
sample = []
for a, ls in by.items():
    # one line per PR, so a big PR doesn't dominate
    perpr = {}
    for l in ls: perpr.setdefault(l['pr_id'], l)
    ls2 = list(perpr.values()); random.shuffle(ls2)
    sample += ls2[:quota.get(a, 4)]
def gh(path):
    r = subprocess.run(['gh', 'api', '--paginate', '--slurp', path], capture_output=True, text=True)
    if r.returncode != 0: return None
    return [x for page in json.loads(r.stdout) for x in page]
res = []
for l in sample:
    repo_pr = l['html_url'].split('github.com/')[1].split('/pull/')
    repo, num = repo_pr[0], repo_pr[1]
    files = gh(f'repos/{repo}/pulls/{num}/files?per_page=100')
    r = {'agent': l['agent'], 'pr': l['html_url'], 'merged': l['merged'], 'file': l['file'], 'line': l['line']}
    if files is None:
        r['verdict'] = 'PR not readable'; res.append(r); continue
    removed = set(); added_here = False; patch_missing = False; file_seen = False
    for f in files:
        p = f.get('patch')
        if f['filename'] == l['file']:
            file_seen = True
            if p is None: patch_missing = True
        if not p: continue
        for x in p.split('\n'):
            if x.startswith('-'): removed.add(x[1:].strip())
            if x.startswith('+') and f['filename'] == l['file'] and x[1:].strip() == l['line']: added_here = True
    if added_here and l['line'] not in removed: r['verdict'] = 'new in PR'
    elif added_here: r['verdict'] = 'moved within PR'
    elif patch_missing: r['verdict'] = 'patch too large to check'
    elif not file_seen: r['verdict'] = 'file not in final PR diff'
    else: r['verdict'] = 'not in final PR diff (added then removed, or pre-existing)'
    res.append(r)
json.dump(res, open(os.path.join(root, 'aidev', OUT), 'w'), indent=1)
C = collections.Counter
print(C((r['agent'], r['verdict']) for r in res))
print(C(r['verdict'] for r in res))
