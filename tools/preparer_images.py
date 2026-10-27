# Prépare les images de l'application à partir des dessins originaux (très grands PNG).
# Usage : python3 tools/preparer_images.py DOSSIER_DES_ORIGINAUX
# Le dossier doit contenir logo-dragonballday.png et les dessins (Goku.png, Freezer.png, IMG_9742.PNG…).
import os,sys
from PIL import Image,ImageDraw,ImageFilter
import numpy as np
SRC=sys.argv[1]; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT=os.path.join(ROOT,'img')
os.makedirs(OUT,exist_ok=True)
PERSOS={'goku':'Goku-icone.png','bulma':'IMG_9742.PNG','piccolo':'IMG_9743.PNG','saiyaman':'IMG_9744.PNG','chichi':'IMG_9745.PNG','trunks':'IMG_9746.PNG','freezer':'Freezer.png'}

# Zones de fond blanc enfermées dans le dessin (entre les doigts, sous le bras), en fraction de la taille de l'image.
TROUS={'Goku.png':[(0.279,0.507),(0.707,0.938)],'Goku-icone.png':[(0.279,0.507),(0.707,0.938)]}

def detourer_fond_blanc(im,trous=()):
    # Rend transparent le fond blanc relié aux bords, plus les trous connus (les blancs des yeux et des dents restent).
    im=im.convert('RGBA'); w,h=im.size
    for x,y in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]+[(int(fx*w),int(fy*h)) for fx,fy in trous]:
        if im.getpixel((x,y))[3]>0 and min(im.getpixel((x,y))[:3])>235:
            ImageDraw.floodfill(im,(x,y),(255,255,255,0),thresh=40)
    # Liseré : les pixels clairs collés au fond retiré (anticrénelage du blanc) deviennent transparents.
    a=np.array(im); vide=Image.fromarray(((a[...,3]==0)*255).astype('uint8')).filter(ImageFilter.MaxFilter(5))
    bord=(np.array(vide)>0)&(a[...,3]>0)&(a[...,:3].min(axis=2)>170)
    a[bord,3]=0
    return Image.fromarray(a)

def recadrer(im,marge=0.02):
    b=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox(); im=im.crop(b)
    m=int(max(im.size)*marge); c=Image.new('RGBA',(im.width+2*m,im.height+2*m),(0,0,0,0)); c.paste(im,(m,m)); return c

for nom,f in PERSOS.items():
    im=Image.open(os.path.join(SRC,f)).convert('RGBA')
    if im.getpixel((5,5))[3]==255: im=detourer_fond_blanc(im,TROUS.get(f,()))
    if nom=='goku': im=im.crop((0,0,im.width,int(im.height*0.92)))  # sous le buste, l'ombre noire du dessin est coupée
    im=recadrer(im); im.thumbnail((360,360),Image.LANCZOS)
    im.save(os.path.join(OUT,nom+'.webp'),'WEBP',quality=86,method=6)

logo=recadrer(detourer_fond_blanc(Image.open(os.path.join(SRC,'logo-dragonballday.png'))),0.01)
l=logo.copy(); l.thumbnail((640,640),Image.LANCZOS); l.save(os.path.join(OUT,'logo.webp'),'WEBP',quality=90,method=6)

# Icône : Goku (dessin de Lolo) sur un fond dégradé orange → rouge, comme le bandeau de l'accueil.
def fond_degrade(t):
    import math
    f=Image.new('RGB',(t,t)); px=f.load()
    stops=[(0,(255,154,31)),(0.38,(226,71,10)),(0.7,(176,0,0)),(1,(110,0,0))]
    for y in range(t):
        for x in range(t):
            d=min(1,math.hypot((x-t*0.75)/(t*1.25),(y-t*0.15)/(t*1.35)))
            for (a,ca),(b,cb) in zip(stops,stops[1:]):
                if d<=b: k=(d-a)/(b-a); px[x,y]=tuple(int(ca[i]+(cb[i]-ca[i])*k) for i in range(3)); break
    return f
fg='Goku-icone.png' if os.path.exists(os.path.join(SRC,'Goku-icone.png')) else 'Goku.png'
g=Image.open(os.path.join(SRC,fg)).convert('RGBA')
if g.getpixel((5,5))[3]==255: g=detourer_fond_blanc(g,TROUS[fg])
g=recadrer(g.crop((0,0,g.width,int(g.height*0.86))),0)  # tout le visage et les cheveux ; le bas du buste est coupé
base=fond_degrade(512)
for nom,taille,marge in [('icon-512.png',512,0.06),('icon-192.png',192,0.06),('apple-touch-icon.png',180,0.04),('favicon.png',64,0.0)]:
    fond=base.resize((taille,taille),Image.LANCZOS).convert('RGBA'); t=int(taille*(1-marge)); b=g.copy(); b.thumbnail((t,t),Image.LANCZOS)
    fond.paste(b,((taille-b.width)//2,taille-b.height),b); fond.convert('RGB').save(os.path.join(ROOT,nom) if nom!='favicon.png' else os.path.join(OUT,nom))
print('Images prêtes dans',OUT)
