# Builds the in-browser photo model (TinyCLIP ViT-40M/32, MIT, microsoft/TinyCLIP) for the site.
# Usage: python build_model.py <checkpoint.pt> <out_dir>
import sys, os, json, zipfile, pickle, collections, types, importlib.util, site
import numpy as np
from scipy.special import erf
CK, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
DT = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'LongStorage': np.int64, 'IntStorage': np.int32}
def load(path):
    z = zipfile.ZipFile(path); root = z.namelist()[0].split('/')[0]
    class St:
        def __init__(s, n): s.name = n
    def rebuild(st, off, size, stride, *a):
        if len(size) == 0: return st[off]
        return np.array(np.lib.stride_tricks.as_strided(st[off:], shape=size, strides=[x * st.itemsize for x in stride]))
    class U(pickle.Unpickler):
        def find_class(s, mod, name):
            if name == '_rebuild_tensor_v2': return rebuild
            if name.endswith('Storage'): return St(name)
            if mod == 'collections' and name == 'OrderedDict': return collections.OrderedDict
            if name == '_rebuild_parameter': return lambda d, rg, bh: d
            return super().find_class(mod, name)
        def persistent_load(s, pid):
            typ, st, key, loc, n = pid
            return np.frombuffer(z.read(f'{root}/data/{key}'), dtype=DT[st.name]).copy()
    return U(z.open(f'{root}/data.pkl')).load()
SD = {k.replace('module.', ''): v.astype(np.float32) for k, v in load(CK)['state_dict'].items()}
_t = types.ModuleType('torch'); _t.LongTensor = object; _t.Tensor = object; _t.device = object; sys.modules.setdefault('torch', _t)
P = next(os.path.join(d, 'open_clip') for d in site.getsitepackages() + [site.getusersitepackages()] if os.path.isdir(os.path.join(d, 'open_clip')))
spec = importlib.util.spec_from_file_location('octok', os.path.join(P, 'tokenizer.py')); tk = importlib.util.module_from_spec(spec); spec.loader.exec_module(tk)
TOK = tk.SimpleTokenizer(os.path.join(P, 'bpe_simple_vocab_16e6.txt.gz'))
def ln(x, w, b): m = x.mean(-1, keepdims=True); v = ((x - m) ** 2).mean(-1, keepdims=True); return (x - m) / np.sqrt(v + 1e-5) * w + b
def block(x, p, H, mask=None):
    h = ln(x, SD[p + 'ln_1.weight'], SD[p + 'ln_1.bias'])
    q, k, v = np.split(h @ SD[p + 'attn.in_proj_weight'].T + SD[p + 'attn.in_proj_bias'], 3, -1)
    L, D = h.shape; hd = D // H
    q, k, v = [t.reshape(L, H, hd).transpose(1, 0, 2) for t in (q, k, v)]
    a = q @ k.transpose(0, 2, 1) / np.sqrt(hd)
    if mask is not None: a = a + mask
    a = np.exp(a - a.max(-1, keepdims=True)); a /= a.sum(-1, keepdims=True)
    x = x + (a @ v).transpose(1, 0, 2).reshape(L, D) @ SD[p + 'attn.out_proj.weight'].T + SD[p + 'attn.out_proj.bias']
    h = ln(x, SD[p + 'ln_2.weight'], SD[p + 'ln_2.bias']); h = h @ SD[p + 'mlp.c_fc.weight'].T + SD[p + 'mlp.c_fc.bias']; h = 0.5 * h * (1 + erf(h / np.sqrt(2)))
    return x + h @ SD[p + 'mlp.c_proj.weight'].T + SD[p + 'mlp.c_proj.bias']
NTL = max(int(k.split('.')[2]) for k in SD if k.startswith('transformer.resblocks')) + 1
def enc(s):
    ids = [TOK.encoder['<start_of_text>']] + TOK.encode(s) + [TOK.encoder['<end_of_text>']]
    L = len(ids); x = SD['token_embedding.weight'][ids] + SD['positional_embedding'][:L]
    mask = np.triu(np.full((L, L), -np.inf), 1)
    for i in range(NTL): x = block(x, f'transformer.resblocks.{i}.', 8, mask)
    e = ln(x, SD['ln_final.weight'], SD['ln_final.bias'])[-1] @ SD['text_projection']; return e / np.linalg.norm(e)
def mean(lst): e = np.mean([enc(t) for t in lst], 0); return e / np.linalg.norm(e)
COL = {'black': ['a photo of a black {s}', 'a black {s}'], 'white': ['a photo of a white {s}', 'a white {s}'],
 'red': ['a photo of a ginger {s}', 'a red ginger {s}'], 'fawn': ['a photo of a fawn colored {s}', 'a beige cream {s}'],
 'brown': ['a photo of a brown {s}', 'a dark brown chocolate {s}'], 'grey': ['a photo of a grey {s}', 'a gray {s}'],
 'spotted': ['a photo of a black and white spotted {s}', 'a {s} with black and white patches'],
 'tricolor': ['a photo of a tricolor {s}, black white and tan', 'a black white and tan {s}'],
 'brindle': ['a photo of a brindle {s} with tiger stripes', 'a brindle striped {s}']}
AG = {'P': ['a photo of a puppy', 'a photo of a very young puppy', 'a photo of a small puppy'], 'A': ['a photo of an adult dog', 'a photo of a grown dog', 'a photo of a dog'], 'S': ['a photo of an old dog with a grey muzzle', 'a photo of a senior dog', 'a photo of an elderly dog']}
AGc = {'P': ['a photo of a kitten', 'a photo of a very young kitten'], 'A': ['a photo of an adult cat', 'a photo of a cat'], 'S': ['a photo of an old cat', 'a photo of a senior cat']}
DOG = ['dog','stray dog','mixed breed dog','mongrel','puppy','husky','samoyed','german shepherd','labrador','golden retriever','terrier','spitz','shepherd dog','hound','beagle','pug','chihuahua','poodle','rottweiler','doberman','boxer','dalmatian','mastiff','alabai','central asian shepherd dog','pit bull','dachshund','spaniel','collie','malamute','wolf-like dog','fluffy white dog','dog lying in the snow']
CAT = ['cat','kitten','stray cat','tabby cat','persian cat','siamese cat','black cat','ginger cat']
NONE = ['an empty cage','a person','people','a room','a blurry photo','a document','a street','a car','a screenshot','a building','a bicycle','food','a ball','a toy','a landscape','a fence','text']
COLS = ['black','white','red','fawn','brown','grey','spotted','tricolor','brindle']
tensors = []; blob = bytearray()
def add(name, arr, q):
    arr = np.ascontiguousarray(arr.astype(np.float32)); ent = {'name': name, 'shape': list(arr.shape)}
    if q:
        flat = arr.reshape(-1, arr.shape[-1]); sc = np.abs(flat).max(0) / 127; sc[sc == 0] = 1
        qv = np.clip(np.round(flat / sc), -127, 127).astype(np.int8)
        while len(blob) % 4: blob.append(0)
        ent.update(dtype='int8', offset=len(blob), scaleOffset=None); blob.extend(qv.tobytes())
        while len(blob) % 4: blob.append(0)
        ent['scaleOffset'] = len(blob); blob.extend(sc.astype(np.float32).tobytes())
    else:
        while len(blob) % 2: blob.append(0)
        ent.update(dtype='f16', offset=len(blob)); blob.extend(arr.astype(np.float16).tobytes())
    tensors.append(ent)
add('conv', SD['visual.conv1.weight'].transpose(2, 3, 1, 0), True)
for k in ['class_embedding', 'positional_embedding', 'ln_pre.weight', 'ln_pre.bias', 'ln_post.weight', 'ln_post.bias']: add(k, SD['visual.' + k], False)
add('proj', SD['visual.proj'], True)
for i in range(12):
    p = f'visual.transformer.resblocks.{i}.'
    for k in ['ln_1.weight', 'ln_1.bias', 'ln_2.weight', 'ln_2.bias', 'attn.in_proj_bias', 'attn.out_proj.bias', 'mlp.c_fc.bias', 'mlp.c_proj.bias']: add(f'{i}.{k}', SD[p + k], False)
    for k in ['attn.in_proj_weight', 'attn.out_proj.weight', 'mlp.c_fc.weight', 'mlp.c_proj.weight']: add(f'{i}.{k}', SD[p + k].T, True)
add('t.kinds.dog', np.stack([enc(f'a photo of a {k}.') for k in DOG]), False)
add('t.kinds.cat', np.stack([enc(f'a photo of a {k}.') for k in CAT]), False)
add('t.kinds.none', np.stack([enc(f'a photo of {k}.') for k in NONE]), False)
add('t.col.dog', np.stack([mean([x.format(s='dog') for x in COL[c]]) for c in COLS]), False)
add('t.col.cat', np.stack([mean([x.format(s='cat') for x in COL[c]]) for c in COLS]), False)
add('t.age.dog', np.stack([mean(AG[a]) for a in 'PAS']), False)
add('t.age.cat', np.stack([mean(AGc[a]) for a in 'PAS']), False)
SH = 14 * 1024 * 1024; shards = []
for i in range(0, len(blob), SH):
    fn = f'clip-{len(shards)}.bin'; open(os.path.join(OUT, fn), 'wb').write(blob[i:i + SH]); shards.append(fn)
json.dump({'model': 'TinyCLIP-ViT-40M-32-Text-19M-LAION400M (vision tower, int8)', 'license': 'MIT (microsoft/TinyCLIP)', 'width': 512, 'layers': 12, 'heads': 8, 'patch': 32, 'bytes': len(blob), 'shards': shards, 'tensors': tensors, 'colors': COLS, 'ages': ['P', 'A', 'S']}, open(os.path.join(OUT, 'clip.json'), 'w'))
print('model built', len(blob), shards)
