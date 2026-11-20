import sys, glob
from PIL import Image
ids=sys.argv[1].split(","); out=sys.argv[2]
W=300
ims=[]
for i in ids:
  for t in (0,1):
    try: im=Image.open(f"an/{i}_{t}.png").convert('RGB'); im=im.resize((W,int(im.height*W/im.width)))
    except: im=Image.new('RGB',(W,300),'gray')
    ims.append(im)
H=max(i.height for i in ims); cols=4; rows=(len(ims)+cols-1)//cols
c=Image.new('RGB',(W*cols,H*rows),'white')
for k,im in enumerate(ims): c.paste(im,((k%cols)*W,(k//cols)*H))
c.save(out)
