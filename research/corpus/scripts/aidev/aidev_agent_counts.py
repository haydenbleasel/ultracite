# Count AIDev-pop PRs per agent label (pull_request table), with retries.
import json, time, urllib.parse, urllib.request, os, sys
root = os.path.join(os.path.dirname(__file__), '..')
out = os.path.join(root, 'aidev', 'agent-counts.json')
res = json.load(open(out)) if os.path.exists(out) else {}
for a in ['Claude_Code', 'OpenAI_Codex', 'Copilot', 'Cursor', 'Devin', 'Google_Jules']:
    if a in res: continue
    u = 'https://datasets-server.huggingface.co/filter?' + urllib.parse.urlencode({'dataset': 'hao-li/AIDev', 'config': 'pull_request', 'split': 'train', 'where': f'"agent"=\'{a}\'', 'offset': 0, 'length': 1})
    for attempt in range(120):
        try:
            with urllib.request.urlopen(u, timeout=120) as r: j = json.loads(r.read())
            if 'num_rows_total' in j: res[a] = j['num_rows_total']; break
        except Exception as e: pass
        time.sleep(10)
    json.dump(res, open(out, 'w'), indent=1); print(a, res.get(a), file=sys.stderr)
print('done', file=sys.stderr)
