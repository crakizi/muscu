import json, numpy as np, trimesh, fast_simplification
R='/home/claude/kevin-mattheus-moerman/bodyparts3d/assets/BodyParts3D_data/stl/'
parts=json.load(open('parts.json'))
TGT={'_skin':30000,'_b':1100,'_n':1200}
SMALL=('phalan','metacarp','metatars','vertebra','nasal','zygomatic','eyeball','patella','navicular','talus','calcane','atlas','axis')
def conv(v): return np.stack([v[:,0], v[:,2], -v[:,1]],1)*0.001
meshes=[]; raw={}
for p in parts:
    m=trimesh.load(R+p['id']+'.stl',force='mesh'); m.merge_vertices()
    v,f=m.vertices.astype(np.float64),m.faces.astype(np.int32)
    raw[p['name']]=conv(v)
    t=TGT.get(p['group'],2600)
    if p['group']=='_b' and any(k in p['name'] for k in SMALL): t=160
    if len(f)>t: v,f=fast_simplification.simplify(v.astype(np.float32),f,target_reduction=1-t/len(f))
    meshes.append([p,conv(np.asarray(v,dtype=np.float64)),f])
skin=[m for m in meshes if m[0]['group']=='_skin'][0][1]
off=np.array([0.0, -skin[:,1].min(), 0.0]); allv=np.concatenate([m[1] for m in meshes if m[0]['group']!='_skin'])
off[0]=-allv[:,0].mean(); off[2]=-allv[:,2].mean()
for m in meshes: m[1]=m[1]+off
for k in raw: raw[k]=raw[k]+off
def top(v,frac=0.05,axis=1,hi=True):
    n=max(5,int(len(v)*frac)); idx=np.argsort(v[:,axis]); idx=idx[-n:] if hi else idx[:n]; return v[idx].mean(0)
J={}
for s,sg in (('left',1),('right',-1)):
    S=s[0].upper()
    hum=raw[f'{s} humerus']; J['sh'+S]=top(hum,0.04); J['el'+S]=top(hum,0.05,hi=False)
    fa=np.concatenate([raw[f'{s} radius'],raw[f'{s} ulna']]); J['wr'+S]=top(fa,0.04,hi=False)
    d=J['wr'+S]-J['el'+S]; J['hd'+S]=J['wr'+S]+d/np.linalg.norm(d)*0.19
    fem=raw[f'{s} femur']; J['hip'+S]=top(fem,0.03); J['kn'+S]=top(fem,0.05,hi=False)
    tib=raw[f'{s} tibia']; J['an'+S]=top(tib,0.04,hi=False); J['to'+S]=J['an'+S]+np.array([0,-0.06,0.15])
    cl=raw[f'{s} clavicle']; i=np.argmin(np.abs(cl[:,0])); J['sc'+S]=cl[np.argsort(np.abs(cl[:,0]))[:30]].mean(0)
J['pel']=(J['hipL']+J['hipR'])/2+np.array([0,0.04,0])
sh_mid=(J['shL']+J['shR'])/2
J['spi']=J['pel']+np.array([0,0.13,-0.01])
J['che']=np.array([0,sh_mid[1]-0.20,J['pel'][2]-0.01])
J['nec']=np.array([0,sh_mid[1]+0.05,sh_mid[2]-0.01])
J['hea']=J['nec']+np.array([0,0.11,0.01]); J['top']=J['hea']+np.array([0,0.16,0.02])
print({k:np.round(v,3).tolist() for k,v in J.items() if k in ('shL','elL','wrL','hipL','knL','anL','pel','che','nec','scL')})
# os : nom, parent, pivot, segments (pour poids)
B=[('root',-1,'pel',[('hipL','hipR'),('pel','spi')]),('spine',0,'spi',[('spi','che')]),('chest',1,'che',[('che','nec')]),('neck',2,'nec',[('nec','hea')]),('head',3,'hea',[('hea','top')])]
for S in 'LR':
    B+= [('clav'+S,2,'sc'+S,[('sc'+S,'sh'+S)]),('ua'+S,None,'sh'+S,[('sh'+S,'el'+S)]),('fa'+S,None,'el'+S,[('el'+S,'wr'+S)]),('hd'+S,None,'wr'+S,[('wr'+S,'hd'+S)])]
for S in 'LR':
    B+= [('th'+S,0,'hip'+S,[('hip'+S,'kn'+S)]),('sh'+S,None,'kn'+S,[('kn'+S,'an'+S)]),('ft'+S,None,'an'+S,[('an'+S,'to'+S)])]
names=[b[0] for b in B]; bi={n:i for i,n in enumerate(names)}
B=[list(b) for b in B]
for b in B:
    if b[1] is None: b[1]=names.index(b[0])-1
def allowed(p):
    n=p['name']; g=p['group']; side=p['side']
    S='L' if side=='left' else 'R' if side=='right' else None
    sd=lambda xs:[x+S for x in xs] if S else []
    if g=='_skin': return None
    if g=='_b':
        for k,v in [('humerus',['ua']),('radius',['fa']),('ulna',['fa']),('femur',['th']),('tibia',['sh']),('fibula',['sh']),('clavicle',['clav']),('scapula',['clav'])]:
            if k in n: return sd(v)
        if 'hip bone' in n or 'sacrum' in n or 'lumbar' in n: return ['root','spine']
        if any(k in n for k in ['frontal','occipital','sphenoid','temporal','parietal','zygomatic','nasal','maxilla','eyeball']) or n in ('atlas','axis'): return ['head']
        if 'cervical' in n: return ['neck','head']
        if 'thoracic' in n: return ['chest','spine']
        if 'patella' in n: return sd(['th','sh'])
        if any(k in n for k in ['metacarp','finger','thumb']) and 'phalan' in n or 'metacarp' in n: return sd(['hd'])
        if any(k in n for k in ['talus','calcane','navicular','metatarsal','toe']): return sd(['ft'])
        if 'mandible' in n: return ['head']
        return ['chest']
    key=g if g!='_n' else n
    rules=[(['calves','tibialis','fibularis','hallucis','digitorum longus'],[],['sh','ft','th']),
      (['delt','rot_cuff','teres','coracobrachialis','infraspinatus','supraspinatus'],['chest'],['clav','ua']),
      (['pec'],['chest'],['clav','ua']),(['biceps','brachialis','triceps'],[],['ua','fa','clav']),
      (['brachioradialis','forearm','extensor carpi','extensor digitorum','extensor digiti','pollicis','flexor carpi','palmaris'],[],['fa','ua','hd']),
      (['lats'],['chest','spine'],['ua']),(['traps','levator','splenius','sternocleido','platysma'],['chest','neck','head'],['clav']),
      (['erectors'],['root','spine','chest'],[]),(['abs','oblique'],['root','spine','chest'],[]),(['serratus'],['chest'],['clav']),
      (['glutes','gluteus','tensor'],['root'],['th']),(['quads','hamstrings','adductors','sartorius','gracilis','iliotibial','pectineus'],['root'],['th','sh']),
      (['calves','tibialis','fibularis','hallucis','flexor digitorum longus','extensor digitorum longus'],[],['sh','ft','th'])]
    for kws,c,s_ in rules:
        if any(k in key for k in kws): return c+sd(s_)
    return ['chest']+sd(['ua'])
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
out_parts=[]; vb=bytearray(); ib=bytearray(); sk=bytearray()
allpos=np.concatenate([m[1] for m in meshes]); lo=allpos.min(0); scale=(allpos.max(0)-lo).max()/65000
for p,v,f in meshes:
    al=allowed(p)
    if al is None: al=names
    cand=[bi[a] for a in al]
    if p['g'] if False else p['group']=='_skin':
        pass
    D=np.stack([np.min([segdist(v,J[a],J[b]) for a,b in B[c][3]],axis=0) for c in cand],1)  # (n,len(cand))
    if p['group']=='_skin':  # côté du corps : interdire les os de l'autre côté
        for k,c in enumerate(cand):
            nm=names[c]
            if nm.endswith('L'): D[v[:,0]<-0.02,k]=9
            if nm.endswith('R'): D[v[:,0]>0.02,k]=9
    w=1/(D**4+1e-7); o=np.argsort(-w,1)[:,:2]; w2=np.take_along_axis(w,o,1); w2=w2/w2.sum(1,keepdims=True)
    i0=np.array(cand)[o[:,0]]; i1=np.array(cand)[o[:,1]] if len(cand)>1 else i0
    q=np.round((v-lo)/scale-32500).astype(np.int16)
    out_parts.append({'n':p['name'],'g':p['group'],'s':p['side'],'vo':len(vb)//2,'vc':len(v),'io':len(ib)//2,'ic':int(f.size),'so':len(sk)})
    vb+=q.tobytes(); ib+=f.astype(np.uint16).tobytes()
    sk+=np.stack([i0,i1,np.round(w2[:,0]*255)],1).astype(np.uint8).tobytes()
hdr={'lo':lo.tolist(),'scale':float(scale),'parts':out_parts,'vbytes':len(vb),'ibytes':len(ib),
     'bones':[{'n':b[0],'p':b[1],'pos':J[b[2]].tolist()} for b in B],'joints':{k:v.tolist() for k,v in J.items()}}
open('body2.bin','wb').write(bytes(vb)+bytes(ib)+bytes(sk)); json.dump(hdr,open('body2.json','w'))
print('bytes',len(vb)+len(ib)+len(sk),'tris',sum(f.shape[0] for _,_,f in meshes))
