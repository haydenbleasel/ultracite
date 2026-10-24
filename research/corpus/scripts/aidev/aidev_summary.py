# Summarise classified suppression lines by tool family. Usage: aidev_summary.py eslint,oxlint
import json, os, sys, collections
root = os.path.join(os.path.dirname(__file__), '..')
T = sys.argv[1].split(',')
L = [json.loads(l) for l in open(os.path.join(root, 'aidev', 'classified-lines.jsonl')) if json.loads(l)['tool'] in T]
ATTR = ('agent account', 'agent signature', "Codex PR, PR author's identity")
C = collections.Counter
new = [l for l in L if not l['carried_over']]
ag = [l for l in new if l['who'] in ATTR]
def prs(ls): return {l['pr_id'] for l in ls}
out = {'tools': T, 'added_lines': len(L), 'carried_over': len(L) - len(new), 'new_by_who': C(l['who'] for l in new),
  'attributed': {'lines': len(ag), 'prs': len(prs(ag)), 'repos': len({l['repo'] for l in ag if l['repo']}), 'commits': len({l['sha'] for l in ag}),
     'merged_prs': len(prs([l for l in ag if l['merged']])),
     'by_agent': {a: {'lines': sum(1 for l in ag if l['agent'] == a), 'prs': len(prs([l for l in ag if l['agent'] == a])),
                      'merged_prs': len(prs([l for l in ag if l['agent'] == a and l['merged']])), 'repos': len({l['repo'] for l in ag if l['agent'] == a and l['repo']})}
                  for a in sorted({l['agent'] for l in ag})},
     'top_repos': C(l['repo'] for l in ag).most_common(5),
     'prs_by_line_count': C(min(v, 5) for v in C(l['pr_id'] for l in ag).values()),
     'form': C('next-line' if 'disable-next-line' in l['line'] else 'same-line' if 'disable-line' in l['line'] else 'block' if '/*' in l['line'] else 'other' for l in ag),
     'with_reason': sum(1 for l in ag if ' -- ' in l['line'] or 'biome-ignore' in l['line'] and ':' in l['line'].split('useExhaustiveDependencies', 1)[-1]),
     'file_status': C(l['status'] for l in ag)},
  'unattributed_by_pr_agent': C(l['agent'] for l in new if l['who'] == 'unattributed'),
  'merges': sum(1 for l in new if l['who'] == 'merge')}
print(json.dumps(out, indent=1, default=dict))
