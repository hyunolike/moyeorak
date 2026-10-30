#!/usr/bin/env python3
"""Validate exported assets using the same renderer used for delivery."""
from pathlib import Path
import concurrent.futures, json, math, re, struct, subprocess, tempfile, zlib
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
NS='{http://www.w3.org/2000/svg}'

def png(path):
    data=path.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n',path
    pos=8;compressed=b''
    while pos<len(data):
        n=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];chunk=data[pos+8:pos+8+n];pos+=n+12
        if kind==b'IHDR': w,h,depth,ctype,_,_,interlace=struct.unpack('>IIBBBBB',chunk)
        if kind==b'IDAT':compressed+=chunk
    assert depth==8 and ctype in (2,6) and interlace==0,(path,depth,ctype,interlace)
    bpp=4 if ctype==6 else 3;stride=w*bpp
    raw=zlib.decompress(compressed);rows=[];prior=bytearray(stride)
    for y in range(h):
        filt=raw[y*(stride+1)];row=bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        if filt==1:
            for i in range(bpp,stride):row[i]=(row[i]+row[i-bpp])&255
        elif filt==2:
            for i in range(stride):row[i]=(row[i]+prior[i])&255
        elif filt==3:
            for i in range(stride):row[i]=(row[i]+((row[i-bpp] if i>=bpp else 0)+prior[i])//2)&255
        elif filt==4:
            for i in range(stride):
                a=row[i-bpp] if i>=bpp else 0;b=prior[i];c=prior[i-bpp] if i>=bpp else 0
                p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c)
                q=a if pa<=pb and pa<=pc else b if pb<=pc else c
                row[i]=(row[i]+q)&255
        else:assert filt==0,filt
        rows.append(row);prior=row
    return w,h,bpp,rows

def luminance(h):
    a=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    a=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in a]
    return sum(v*w for v,w in zip(a,[.2126,.7152,.0722]))

def contrast(a,b):
    lo,hi=sorted([luminance(a),luminance(b)])
    return (hi+.05)/(lo+.05)

def render_svg(source,tmp):
    rel=str(source.relative_to(ROOT));r=ET.fromstring(source.read_text())
    assert r.tag==NS+'svg' and 'viewBox' in r.attrib,rel
    x,y,w,h=map(float,r.attrib['viewBox'].split());assert x==y==0 and w>0 and h>0,rel
    assert not list(r.iter(NS+'image')),f'Raster: {rel}'
    assert not list(r.iter(NS+'foreignObject')) and not list(r.iter(NS+'script')),rel
    for node in r.iter():
        for attr,value in node.attrib.items():
            if attr.endswith('href'):assert value.startswith('#'),f'External reference {rel}'
    content=source.read_text()
    assert '__T' not in content and '__X' not in content and '__EN__' not in content,rel
    assert 'linearGradient' not in content and 'radialGradient' not in content,rel
    if rel.startswith('logo/'): assert not list(r.iter(NS+'text')),rel
    if rel.startswith('character/expressions/'):assert (w,h)==(240,240),rel
    if rel.startswith('character/avatar/'):assert (w,h)==(160,160),rel
    # Expand the viewport to reveal any elements that the deliverable viewport clips.
    padding=16
    r.set('width',str(int(w+padding*2)));r.set('height',str(int(h+padding*2)))
    r.set('viewBox',f'{-padding} {-padding} {w+padding*2} {h+padding*2}')
    r.set('overflow','visible')
    name=rel.replace('/','_')
    expanded=tmp/(name+'.svg');output=tmp/(name+'.png')
    expanded.write_bytes(ET.tostring(r))
    process=subprocess.run(['rsvg-convert',str(expanded),'-o',str(output)],capture_output=True,text=True)
    assert process.returncode==0,(rel,process.stderr)
    pw,ph,bpp,rows=png(output)
    assert bpp==4,(rel,'expanded canvas must preserve alpha')
    outside=0
    for iy,row in enumerate(rows):
        if iy<padding or iy>=padding+int(h):
            outside+=sum(a>8 for a in row[3::4])
        else:
            outside+=sum(a>8 for a in row[3:padding*4:4])
            outside+=sum(a>8 for a in row[(padding+int(w))*4+3::4])
    assert outside==0,(rel,f'{outside} painted pixels outside the viewBox')
    return dict(file=rel,viewBox=[x,y,w,h],rendered=True,pixelsOutsideViewBox=outside)

class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ['href','src'] and value:self.links.append(value)

def main():
    expected={
      'app-icon/icon-512.png':(512,512),'app-icon/icon-192.png':(192,192),
      'app-icon/apple-touch-180.png':(180,180),'app-icon/favicon-32.png':(32,32),
      'app-icon/favicon-16.png':(16,16),'app-icon/maskable-512.png':(512,512),
      'og/og-default.png':(1200,630),'brand-board.png':(1600,1910),
      'mockups/01-landing.png':(390,844),'mockups/02-meeting-home.png':(390,844),
      'mockups/03-suggestion.png':(390,844)}
    dimensions=[]
    for file,wh in expected.items():
        w,h,_,_=png(ROOT/file);assert (w,h)==wh,(file,w,h,wh)
        dimensions.append(dict(file=file,width=w,height=h))
    files=sorted(ROOT.rglob('*.svg'))
    with tempfile.TemporaryDirectory(prefix='.render-check-',dir=ROOT/'qa') as temp:
        # Independent, read-only rendering checks. Exported assets are never altered.
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            rendered=list(pool.map(lambda f:render_svg(f,Path(temp)),files))

    text_pairs=[
      ('본문','#202923','#F6F7F2'),('카드 본문','#202923','#FFFFFF'),
      ('보조 본문','#57665E','#F6F7F2'),('카드 보조 본문','#57665E','#FFFFFF'),
      ('홍시 위 글자','#202923','#F45B3F'),('주요 버튼','#F6F7F2','#176B5B'),
      ('텍스트 행동','#176B5B','#F6F7F2'),('비서 발화','#202923','#F3CF58'),
      ('성공','#176B4C','#FFFFFF'),('주의','#815800','#FFFFFF'),('오류','#B33932','#FFFFFF'),
      ('성공 / 화면','#176B4C','#F6F7F2'),('주의 / 화면','#815800','#F6F7F2'),('오류 / 화면','#B33932','#F6F7F2'),
      ('다크 본문','#F6F7F2','#17251F'),('다크 카드 본문','#F6F7F2','#24392F'),
      ('다크 보조 본문','#B9C8BF','#24392F'),('다크 버튼','#17251F','#7DD4B5'),
      ('다크 성공','#7DD4B5','#24392F'),('다크 주의','#F3CF58','#24392F'),('다크 오류','#FFA79B','#24392F')]
    ratios=[]
    for label,fg,bg in text_pairs:
        ratio=contrast(fg,bg);assert ratio>=4.5,(label,ratio)
        ratios.append(dict(role=label,foreground=fg,background=bg,ratio=round(ratio,4),AA_normal_text=True))
    outlines=[]
    for fg,bg in [('#718077','#FFFFFF'),('#7E9689','#24392F')]:
        ratio=contrast(fg,bg);assert ratio>=3
        outlines.append(dict(foreground=fg,background=bg,ratio=round(ratio,4),AA_nontext=True))
    (ROOT/'qa/contrast.json').write_text(json.dumps(dict(method='WCAG relative luminance, sRGB',text=ratios,outlines=outlines,prohibited=dict(foreground='#FFFFFF',background='#F45B3F',ratio=round(contrast('#FFFFFF','#F45B3F'),4))),ensure_ascii=False,indent=2)+'\n')

    w,h,bpp,rows=png(ROOT/'app-icon/maskable-512.png');escaped=0;maxr=0
    for iy,row in enumerate(rows):
        for ix in range(w):
            rgb=row[ix*bpp:ix*bpp+3]
            if any(abs(a-b)>5 for a,b in zip(rgb,(246,247,242))):
                radius=math.hypot(ix+.5-256,iy+.5-256);maxr=max(maxr,radius)
                if radius>204.8:escaped+=1
    assert escaped==0,escaped
    links=Links();links.feed((ROOT/'index.html').read_text())
    for link in links.links:
        if link.startswith(('#','http:','https:','data:')):continue
        assert (ROOT/link).exists() or link=='qa/verification.json',link
    motion=(ROOT/'character/motion/thinking-loop.svg').read_text()
    assert '1.6s' in motion and 'prefers-reduced-motion:reduce' in motion and 'animation:none!important' in motion
    shaped=json.loads((ROOT/'qa/text-shaping.json').read_text());assert shaped['missingGlyphs']==0
    report=dict(status='PASS',renderer=subprocess.check_output(['rsvg-convert','--version'],text=True).strip(),
       svgCount=len(rendered),pngCount=len(dimensions),allowedTextPairs=len(ratios),svg=rendered,png=dimensions,
       maskable=dict(safeRadius=204.8,maxForegroundRadius=round(maxr,2),pixelsOutsideSafeCircle=escaped),
       htmlLocalLinksChecked=len(links.links),logoLiveText=False,rasterEmbedded=False,externalSvgReferences=False,
       reducedMotion='embedded CSS disables all keyframes',textShaping=shaped)
    (ROOT/'qa/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f'PASS: {len(rendered)} SVGs rendered; no viewBox overflow, raster, or external references.')
    print(f'PASS: {len(dimensions)} PNG dimensions; {len(ratios)} text pairs AA; maskable safe circle ({maxr:.2f} < 204.8px).')
    print(f'PASS: {len(links.links)} HTML file links; reduced motion; 0 missing glyphs.')

if __name__=='__main__':main()
