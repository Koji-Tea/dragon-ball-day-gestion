# Prépare les images de l'application à partir des dessins originaux (très grands PNG).
# Usage : python3 tools/preparer_images.py DOSSIER_DES_ORIGINAUX
# Le dossier doit contenir logo-dragonballday.png et les dessins (Goku.png, Freezer.png, IMG_9742.PNG…).
import os,sys
from PIL import Image,ImageDraw
SRC=sys.argv[1]; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT=os.path.join(ROOT,'img')
os.makedirs(OUT,exist_ok=True)
PERSOS={'goku':'Goku.png','bulma':'IMG_9742.PNG','piccolo':'IMG_9743.PNG','saiyaman':'IMG_9744.PNG','chichi':'IMG_9745.PNG','trunks':'IMG_9746.PNG','freezer':'Freezer.png'}

def detourer_fond_blanc(im):
    # Rend transparent le fond blanc relié aux bords (les blancs à l'intérieur du dessin restent).
    im=im.convert('RGBA'); w,h=im.size
    for x,y in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
        if im.getpixel((x,y))[3]>0 and min(im.getpixel((x,y))[:3])>235:
            ImageDraw.floodfill(im,(x,y),(255,255,255,0),thresh=40)
    return im

def recadrer(im,marge=0.02):
    b=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox(); im=im.crop(b)
    m=int(max(im.size)*marge); c=Image.new('RGBA',(im.width+2*m,im.height+2*m),(0,0,0,0)); c.paste(im,(m,m)); return c

for nom,f in PERSOS.items():
    im=Image.open(os.path.join(SRC,f)).convert('RGBA')
    if im.getpixel((5,5))[3]==255: im=detourer_fond_blanc(im)
    im=recadrer(im); im.thumbnail((360,360),Image.LANCZOS)
    im.save(os.path.join(OUT,nom+'.webp'),'WEBP',quality=86,method=6)

logo=recadrer(detourer_fond_blanc(Image.open(os.path.join(SRC,'logo-dragonballday.png'))),0.01)
l=logo.copy(); l.thumbnail((640,640),Image.LANCZOS); l.save(os.path.join(OUT,'logo.webp'),'WEBP',quality=90,method=6)

# Icône : la boule à une étoile du logo, sur fond crème (avec marge pour les icônes « maskable »).
src=Image.open(os.path.join(SRC,'logo-dragonballday.png')).convert('RGBA'); W,H=src.size
cx,cy,r=int(W*0.507),int(H*0.124),int(W*0.057)
boule=src.crop((cx-r,cy-r,cx+r,cy+r)); masque=Image.new('L',boule.size,0); ImageDraw.Draw(masque).ellipse((0,0,2*r-1,2*r-1),fill=255)
boule.putalpha(masque)
for nom,taille,pad in [('icon-512.png',512,0.16),('icon-192.png',192,0.16),('apple-touch-icon.png',180,0.12),('favicon.png',64,0.04)]:
    fond=Image.new('RGBA',(taille,taille),(255,243,214,255)); t=int(taille*(1-2*pad)); b=boule.copy(); b.thumbnail((t,t),Image.LANCZOS)
    fond.paste(b,((taille-b.width)//2,(taille-b.height)//2),b); fond.convert('RGB').save(os.path.join(ROOT,nom) if nom!='favicon.png' else os.path.join(OUT,nom))
print('Images prêtes dans',OUT)
