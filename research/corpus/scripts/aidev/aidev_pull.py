# Page through AIDev pr_commit_details rows matching a LIKE pattern and keep only
# compact records of suppression lines. Usage: python3 -I aidev_pull.py <tag> <like-pattern> <regex-for-lines>
import json, sys, time, urllib.parse, urllib.request, re, os
tag, like, linere = sys.argv[1], sys.argv[2], re.compile(sys.argv[3])
out = os.path.join(os.path.dirname(__file__), '..', 'aidev', f'{tag}-compact.jsonl')
base = 'https://datasets-server.huggingface.co/filter?'
def get(offset):
    q = urllib.parse.urlencode({'dataset': 'hao-li/AIDev', 'config': 'pr_commit_details', 'split': 'train',
        'where': f'"patch" LIKE \'{like}\'', 'offset': offset, 'length': 100})
    for attempt in range(90):
        try:
            with urllib.request.urlopen(base + q, timeout=120) as r:
                j = json.loads(r.read())
            if 'rows' in j: return j
            print('retry', offset, j.get('error'), file=sys.stderr)
        except Exception as e:
            print('retry', offset, e, file=sys.stderr)
        time.sleep(10)
    raise SystemExit(f'failed at {offset}')
j = get(0); total = j['num_rows_total']; print('total', total, file=sys.stderr)
done = set()
if os.path.exists(out):
    old = [json.loads(l) for l in open(out)]
    old_totals = {o.get('total') for o in old}
    if old_totals - {total, None} or (None in old_totals and total != int(os.environ.get('PREV_TOTAL', total))):
        os.rename(out, out + f'.stale-{int(time.time())}')
        print('total changed; restarting', old_totals, total, file=sys.stderr)
    else:
        done = {o['offset'] for o in old}
with open(out, 'a') as f:
    for off in range(0, total, 100):
        if off in done: continue
        jj = j if off == 0 else get(off)
        recs = []
        for row in jj['rows']:
            r = row['row']; patch = r.get('patch') or ''
            added = [l for l in patch.split('\n') if l.startswith('+') and linere.search(l)]
            removed = [l for l in patch.split('\n') if l.startswith('-') and linere.search(l)]
            recs.append({k: r.get(k) for k in ('sha','pr_id','author','committer','message','filename','status')} | {'added': added, 'removed': removed})
        f.write(json.dumps({'offset': off, 'n': len(jj['rows']), 'total': total, 'recs': recs}) + '\n'); f.flush()
        print('page', off, file=sys.stderr)
        time.sleep(1)
print('done', file=sys.stderr)
