import json, numpy as np, trimesh, fast_simplification, struct, sys
R='/home/claude/kevin-mattheus-moerman/bodyparts3d/assets/BodyParts3D_data/stl/'
parts=json.load(open('parts.json'))
TGT={'_skin':14000,'_b':500,'_n':700}
meshes=[]
for p in parts:
    m=trimesh.load(R+p['id']+'.stl',force='mesh'); m.merge_vertices()
    t=TGT.get(p['group'],1400)
    v,f=m.vertices.astype(np.float32),m.faces.astype(np.int32)
    if len(f)>t:
        v,f=fast_simplification.simplify(v,f,target_reduction=1-t/len(f))
    meshes.append((p,v,f))
allv=np.concatenate([v for _,v,_ in meshes]); lo,hi=allv.min(0),allv.max(0)
print('bbox',lo,hi)
scale=(hi-lo).max()/65000.0
hdr={'lo':lo.tolist(),'scale':float(scale),'parts':[]}
vb=bytearray(); ib=bytearray()
for p,v,f in meshes:
    q=np.round((v-lo)/scale-32500).astype(np.int16)
    hdr['parts'].append({'n':p['name'],'g':p['group'],'s':p['side'],'vo':len(vb)//2,'vc':len(v),'io':len(ib)//2,'ic':f.size})
    vb+=q.tobytes(); ib+=f.astype(np.uint16).tobytes()
hdr['vbytes']=len(vb)
open('body.bin','wb').write(bytes(vb)+bytes(ib)); json.dump(hdr,open('body.json','w'))
print(len(vb)+len(ib), sum(f.shape[0] for _,_,f in meshes))
