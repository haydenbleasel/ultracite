# For agent PRs whose title is about fixing lint warnings: does the PR's final diff add exhaustive-deps
# suppressions (net of removals), and how many? Read-only gh.
import json, re, subprocess, os, collections
root = os.path.join(os.path.dirname(__file__), '..')
urls = ['https://github.com/pdfme/pdfme/pull/821', 'https://github.com/skypilot-org/skypilot/pull/8655',
        'https://github.com/MetaMask/metamask-extension/pull/41366', 'https://github.com/FalkorDB/falkordb-browser/pull/1336',
        'https://github.com/MetaMask/metamask-extension/pull/40883', 'https://github.com/latitude-dev/latitude-llm/pull/1390',
        'https://github.com/FrankChen021/datastoria/pull/160', 'https://github.com/actualbudget/actual/pull/6667',
        'https://github.com/fastrepl/char/pull/2337', 'https://github.com/TheExGenesis/community-archive/pull/303']
SUP = re.compile(r'(eslint-disable|oxlint-disable|biome-ignore).*(exhaustive-deps|useExhaustiveDependencies)')
out = []
for u in urls:
    repo, num = u.split('github.com/')[1].split('/pull/')
    pr = json.loads(subprocess.run(['gh', 'api', f'repos/{repo}/pulls/{num}'], capture_output=True, text=True).stdout or '{}')
    r = subprocess.run(['gh', 'api', '--paginate', '--slurp', f'repos/{repo}/pulls/{num}/files?per_page=100'], capture_output=True, text=True)
    files = [x for p in json.loads(r.stdout) for x in p] if r.returncode == 0 else []
    add = rem = 0; missing = 0
    for f in files:
        p = f.get('patch')
        if p is None: missing += 1; continue
        for x in p.split('\n'):
            if SUP.search(x):
                if x.startswith('+'): add += 1
                elif x.startswith('-'): rem += 1
    out.append({'url': u, 'title': pr.get('title'), 'user': (pr.get('user') or {}).get('login'), 'merged_at': pr.get('merged_at'), 'state': pr.get('state'),
                'files': len(files), 'files_without_patch': missing, 'suppressions_added': add, 'suppressions_removed': rem})
json.dump(out, open(os.path.join(root, 'aidev', 'lintfix-prs.json'), 'w'), indent=1)
for o in out: print(o['suppressions_added'], '+ /', o['suppressions_removed'], '- |', o['state'], 'merged' if o['merged_at'] else '', '|', o['title'][:80], '|', o['url'])
