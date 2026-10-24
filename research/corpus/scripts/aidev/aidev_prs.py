# Fetch AIDev pull_request rows (agent label, state, URL) for PR ids, 15 per query, resumable.
import json, sys, time, urllib.parse, urllib.request, os
root = os.path.join(os.path.dirname(__file__), '..')
ids = [str(i) for i in json.load(open(os.path.join(root, 'aidev', sys.argv[1])))]
out = os.path.join(root, 'aidev', 'prs.jsonl')
have = set()
if os.path.exists(out):
    for l in open(out): have.add(json.loads(l)['id'])
todo = [i for i in ids if i not in have]
print('todo', len(todo), file=sys.stderr)
def q(batch):
    where = ' OR '.join(f'"id"={int(i)}' for i in batch)
    u = 'https://datasets-server.huggingface.co/filter?' + urllib.parse.urlencode({'dataset': 'hao-li/AIDev', 'config': 'pull_request', 'split': 'train', 'where': where, 'offset': 0, 'length': 100})
    for attempt in range(90):
        try:
            with urllib.request.urlopen(u, timeout=120) as r: j = json.loads(r.read())
            if 'rows' in j: return j['rows']
            print('retry', j.get('error'), file=sys.stderr)
        except Exception as e: print('retry', e, file=sys.stderr)
        time.sleep(10)
    raise SystemExit('gave up')
with open(out, 'a') as f:
    for k in range(0, len(todo), 40):
        batch = todo[k:k+40]
        rows = q(batch)
        got = set()
        for r in rows:
            x = r['row']; x['id'] = str(x['id']); got.add(x['id'])
            f.write(json.dumps({k2: x.get(k2) for k2 in ('id','number','agent','user','state','created_at','merged_at','html_url','title')}) + '\n')
        for i in batch:
            if i not in got: f.write(json.dumps({'id': i, 'missing': True}) + '\n')
        f.flush(); print('batch', k, len(rows), file=sys.stderr); time.sleep(1)
print('done', file=sys.stderr)
