#!/usr/bin/env python3
"""Local, deterministic SVG source and rsvg-convert export. No network access."""
from pathlib import Path
from xml.sax.saxutils import escape
import hashlib, json, math, re, shutil, struct, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
P = dict(primary='#F45B3F', secondary='#176B5B', accent='#F3CF58', ink='#202923',
         light='#F6F7F2', dark='#17251F', paper='#FFFFFF', muted='#57665E',
         line='#D6DED6', success='#176B4C', warning='#815800', error='#B33932',
         darkCard='#24392F', darkText='#F6F7F2', darkMuted='#B9C8BF')
FILES = {}
TEXTS = {}
USES = []

def rect(x,y,w,h,fill,rx=0,stroke=None,sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'

def path(d,fill='none',stroke=None,sw=8,extra=''):
    return f'<path d="{d}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '')+f' {extra}/>'

def circle(x,y,r,fill,stroke=None,sw=8):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'

def group(body,x=0,y=0,scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})">{body}</g>'

def text(s,x,y,size=20,fill=None,bold=False,anchor='start'):
    k = hashlib.sha1(f'{s}|{size}|{bold}'.encode()).hexdigest()[:14]
    TEXTS[k] = dict(key=k,text=s,size=size,weight='bold' if bold else 'regular')
    i = len(USES)
    USES.append(dict(k=k,x=x,y=y,anchor=anchor))
    return f'<g aria-label="{escape(s)}" transform="translate(__X{i}__ {y})"><path fill="{fill or P["ink"]}" d="__T{k}__"/></g>'

def svg(w,h,body,title,desc=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title><desc>{escape(desc)}</desc>{body}</svg>\n'

def save(name,w,h,body,title,desc=''):
    FILES[name] = svg(w,h,body,title,desc)

def pill(label,x,y,w,fill=None,fg=None,h=32,size=14):
    return rect(x,y,w,h,fill or P['light'],h/2)+text(label,x+w/2,y+h/2+size*.34,size,fg,bold=True,anchor='middle')

def face(exp='default',symbol=False):
    ink=P['ink']
    b=rect(36,52,88,48,P['light'],24)
    if exp=='happy':
        b+=path('M57 78 Q63 64 69 78 M91 78 Q97 64 103 78',stroke=ink,sw=7)
    elif exp=='waiting':
        b+=rect(56,73,16,8,ink,4)+rect(90,73,16,8,ink,4)
    elif exp=='sorry':
        b+=path('M56 72 L68 67 M92 67 L104 72',stroke=ink,sw=6)
        b+=circle(63,82,5,ink)+circle(97,82,5,ink)
    elif exp=='thinking':
        b+=rect(58,60,10,18,ink,5)+rect(92,60,10,18,ink,5)
    elif exp=='guide':
        b+=rect(58,64,10,24,ink,5)+path('M92 78 Q98 66 104 78',stroke=ink,sw=7)
    else:
        b+=rect(58,64,10,24,ink,5)+rect(92,64,10,24,ink,5)
    if not symbol:
        mouths=dict(default='M72 116 Q80 124 88 116',thinking='M76 118 H84',waiting='M73 118 H87',
                    happy='M68 112 Q80 130 92 112',sorry='M72 122 Q80 114 88 122',guide='M72 115 Q80 124 88 115')
        b+=circle(86,118,5,ink) if exp=='thinking' else path(mouths[exp],stroke=ink,sw=6)
    return b

TILE='M48 16 H112 Q144 16 144 48 V112 L112 144 H48 Q16 144 16 112 V48 Q16 16 48 16 Z'

def head(exp='default',symbol=False,outline=True):
    return path(TILE,P['primary'],P['ink'] if outline else None,8)+face(exp,symbol)

def character(exp='default'):
    ink=P['ink']; yellow=P['accent']
    # Each branch terminates in an ungloved station dot. No shoes or cloud lobes.
    arms=dict(
      default=('M60 130 H36 V112','M180 130 H204 V112'),
      thinking=('M60 130 H36 V112','M180 130 H202 V88 H182'),
      waiting=('M60 130 H36 V148','M180 130 H204 V148'),
      happy=('M60 124 H36 V84','M180 124 H204 V84'),
      sorry=('M60 134 H40 V156','M180 134 H200 V156'),
      guide=('M60 130 H36 V112','M180 130 H204 V72'))[exp]
    ends=dict(default=((36,112),(204,112)),thinking=((36,112),(182,88)),waiting=((36,148),(204,148)),
              happy=((36,84),(204,84)),sorry=((40,156),(200,156)),guide=((36,112),(204,72)))[exp]
    # A 4px exterior light keyline keeps the dark limbs visible on dark surfaces.
    b=rect(82,168,20,38,P['light'],10,P['light'],8)+rect(138,168,20,38,P['light'],10,P['light'],8)
    for a in arms: b+=path(a,stroke=P['light'],sw=16)
    b+=group(path(TILE,P['light'],P['light'],16),40,28)
    for x,y in ends: b+=circle(x,y,9,P['light'],P['light'],16)
    b+=rect(82,168,20,38,ink,10)+rect(138,168,20,38,ink,10)
    for a in arms: b+=path(a,stroke=ink,sw=8)
    b+=group(head(exp),40,28)
    for x,y in ends: b+=circle(x,y,9,yellow,ink,8)
    return b

def ring(x,y,w,h,t=10,rx=4,fill=None):
    # Closed compound path, evenodd aperture. All wordmark geometry is fill-only.
    def rr(x,y,w,h,r):
        r=min(r,w/2,h/2)
        return f'M{x+r} {y}H{x+w-r}Q{x+w} {y} {x+w} {y+r}V{y+h-r}Q{x+w} {y+h} {x+w-r} {y+h}H{x+r}Q{x} {y+h} {x} {y+h-r}V{y+r}Q{x} {y} {x+r} {y}Z'
    return path(rr(x,y,w,h,rx)+rr(x+t,y+t,w-2*t,h-2*t,max(0,rx-2)),fill or P['ink'],extra='fill-rule="evenodd"')

def ko(fill=None):
    c=fill or P['ink']; b=''
    # 모: ㅁ / ㅗ. 여: ㅇ + ㅕ. 락: ㄹ + ㅏ / ㄱ.
    b+=ring(4,4,52,36,10,5,c)+rect(25,44,10,17,c,3)+rect(0,58,60,10,c,3)
    b+=ring(72,10,32,46,9,16,c)+rect(116,0,10,68,c,3)+rect(110,16,16,10,c,3)+rect(110,40,16,10,c,3)
    # ㄹ is constructed as one closed polygon, with horizontal registration.
    b+=path('M144 3 H182 V29 H154 V36 H184 V46 H144 V20 H172 V13 H144 Z',c)
    b+=rect(192,0,10,49,c,3)+rect(198,19,15,10,c,3)
    b+=path('M148 57 H202 V81 H192 V67 H148 Z',c)
    return b

def en(fill=None):
    # Custom continuous strokes expanded by CoreGraphics into closed outlines.
    return f'<path fill="{fill or P["ink"]}" d="__EN__"/>'

def lockup(fill=None,mono=False):
    h=head(symbol=True,outline=False)
    if mono:
        c=fill or P['ink']
        # Knockout capsule rather than painted white: works on any background.
        capsule='M60 52 H100 A24 24 0 0 1 100 100 H60 A24 24 0 0 1 60 52Z'
        h=path(TILE+capsule,c,extra='fill-rule="evenodd"')+rect(58,64,10,24,c,5)+rect(92,64,10,24,c,5)
    return group(h,0,0,.6)+group(ko(fill),120,9,.9)

def route(x,y,scale=1,color=None):
    c=color or P['secondary']
    b=path('M0 80 H64 Q80 80 80 64 V16 M80 80 H160 Q176 80 176 96 V144 M80 80 V144',stroke=c,sw=12)
    b+=circle(80,80,22,P['light'],c,10)
    for a,z in [(0,80),(80,16),(176,144),(80,144)]: b+=circle(a,z,8,c)
    return group(b,x,y,scale)

def speech(lines,x=0,y=0,w=342,avatar=True):
    b=rect(x,y,w,132,P['accent'],24)
    b+=path(f'M{x+32} {y+130} V{y+146} L{x+54} {y+130}Z',P['accent'])
    b+=pill('마주의 한마디',x+20,y+16,112,P['ink'],P['light'],26,12)
    for i,line in enumerate(lines): b+=text(line,x+20,y+71+i*25,17,bold=True)
    if avatar: b+=group(head('waiting'),x+w-68,y+12,.3)
    return b

def button(label,x,y,w,secondary=False):
    return rect(x,y,w,56,P['light'] if secondary else P['secondary'],16, P['line'] if secondary else None)+text(label,x+w/2,y+35,17,P['ink'] if secondary else P['light'],True,'middle')

def statusbar():
    return text('9:41',24,28,15,bold=True)+path('M310 22 H314 M318 18 V24 M325 14 V24',stroke=P['ink'],sw=3)+rect(340,14,25,12,'none',4,P['ink'],1.5)+rect(343,17,18,6,P['ink'],1)+rect(366,18,2,4,P['ink'],1)

def phone_base(title=''):
    return rect(0,0,390,844,P['light'])+statusbar()+rect(142,822,106,5,P['ink'],3)

def app_header(back=False):
    b=path('M32 62 L24 70 L32 78',stroke=P['ink'],sw=2.5) if back else group(lockup(),22,52,.42)
    if back: b+=text('우리 주말 모임',48,76,17,bold=True)
    b+=circle(354,70,3,P['ink'])+circle(344,70,3,P['ink'])+circle(364,70,3,P['ink'])
    return b

EXP=['default','thinking','waiting','happy','sorry','guide']
LABELS=['기본','생각 중','기다림','기쁨','미안함','안내']

def create():
    # Logo masters, with generous built-in artboard margin.
    save('logo/symbol.svg',160,160,head(symbol=True,outline=False),'모여락 합류점 심벌','합류역의 공통 구간을 담은 독립 심벌')
    save('logo/wordmark-ko.svg',233,101,group(ko(),10,10),'모여락 한글 워드마크','직접 설계한 기하학 한글, 모든 글자는 닫힌 윤곽선')
    save('logo/wordmark-en.svg',330,85,group(en(),12,12),'moyeorak Latin wordmark','Custom geometric lowercase outlines')
    save('logo/lockup-horizontal.svg',336,112,group(lockup(),12,8),'모여락 가로 조합')
    save('logo/lockup-vertical.svg',260,272,group(head(symbol=True,outline=False),50,4)+group(ko(),24,172,1),'모여락 세로 조합')
    for name,color in [('black','#000000'),('white','#FFFFFF')]:
        save(f'logo/lockup-horizontal-mono-{name}.svg',336,112,group(lockup(color,True),12,8),f'모여락 단색 {name} 가로 조합')
    # Character masters and 32px optical avatar variants.
    for exp in EXP:
        save(f'character/expressions/{exp}.svg',240,240,character(exp),f'마주 {LABELS[EXP.index(exp)]}', '240 × 240 공통 캔버스, 8단위 그리드')
        save(f'character/avatar/{exp}.svg',160,160,head(exp),f'마주 얼굴 {LABELS[EXP.index(exp)]}', '32px 표시 권장, 팔과 다리가 없는 얼굴 전용 그림')
    motion='''<style>@keyframes consider{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes progress{0%,100%{opacity:.35}40%{opacity:1}}.maju{animation:consider 1.6s ease-in-out infinite}.station{animation:progress 1.6s ease-in-out infinite}.s2{animation-delay:.2s}.s3{animation-delay:.4s}@media(prefers-reduced-motion:reduce){.maju,.station{animation:none!important;transform:none!important;opacity:1!important}}</style>'''
    motion+='<g class="maju">'+character('thinking')+'</g>'
    for i in range(3): motion+=f'<g class="station s{i+1}">'+circle(96+i*24,224,5,P['secondary'])+'</g>'
    save('character/motion/thinking-loop.svg',240,240,motion,'마주가 조건을 비교하고 있어요','1.6초 루프. 움직임 줄이기 설정에서 정지.')

    # Exploration: the forms, wordmarks and palettes differ, not just the hues.
    a=rect(0,0,1100,620,P['light'])+text('합류점',48,75,40,bold=True)+text('서로 다른 출발점, 함께 닿는 한 구간',48,116,21)
    a+=group(character(),112,164,1.45)+group(head(symbol=True,outline=False),530,200,1.05)+group(ko(),752,230,1.1)
    a+=route(620,354,.8)+text('노선의 끝점 → 역명판 → 조율 비서',48,564,22,bold=True)
    save('exploration/01-junction.svg',1100,620,a,'탐색 1 합류점')
    b=rect(0,0,1100,620,'#F3F1FA')+text('겹친 한 칸',48,75,40,'#3D346F',True)+text('모두의 시간표에서 겹치는 한 칸을 찾아요',48,116,21,'#3D346F')
    b+=rect(168,208,170,200,'#CFC5EF',28,'#3D346F',8)+rect(234,258,170,200,'#7961B4',28,'#3D346F',8)
    b+=rect(234,258,104,150,'#F7D675',24)+circle(264,312,7,'#3D346F')+circle(306,312,7,'#3D346F')+path('M270 350 Q286 362 302 350',stroke='#3D346F',sw=8)
    b+=rect(564,236,72,90,'#CFC5EF',12)+rect(594,266,72,90,'#7961B4',12)+rect(594,266,42,60,'#F7D675',6)
    b+=text('모여락',710,324,68,'#3D346F',True)+text('겹침은 시간에는 강하지만, 이동의 공평함까지 설명하기는 어려워요.',48,562,21,'#3D346F')
    save('exploration/02-overlap.svg',1100,620,b,'탐색 2 겹친 한 칸')
    c=rect(0,0,1100,620,'#F1F7F5')+text('우리 한자리',48,75,40,'#173D40',True)+text('친구들의 자리를 먼저 마련하는 작은 원탁',48,116,21,'#173D40')
    c+=rect(264,180,56,72,'#E6B46C',18)+rect(144,298,72,56,'#E6B46C',18)+rect(366,298,72,56,'#E6B46C',18)
    c+=circle(290,326,100,'#74B9AB','#173D40',8)+rect(244,302,14,26,'#173D40',7)+rect(312,302,14,26,'#173D40',7)+path('M266 352 Q286 370 306 352',stroke='#173D40',sw=8)
    c+=circle(620,300,46,'#74B9AB')+rect(606,232,28,28,'#173D40',7)+rect(548,286,28,28,'#173D40',7)+rect(664,286,28,28,'#173D40',7)
    c+=text('모여락',744,324,58,'#173D40')+text('환대의 정서는 좋지만, 작은 크기에서는 의자가 꽃잎처럼 보일 수 있어요.',48,562,21,'#173D40')
    save('exploration/03-table.svg',1100,620,c,'탐색 3 우리 한자리')
    summaries=[
      ('01-junction','합류점','지하철 노선이 합쳐지는 공통 구간을 역명판 모양으로 만들었다. 얼굴의 밝은 캡슐은 함께 가능한 시간과 중간지점이고, 두 눈은 그곳에 도착한 사람이다. 팔 끝은 노선의 종점이며 꺾인 모서리는 다음 구간으로 이어지는 방향을 남긴다. 심벌에서 캐릭터, 장소 안내까지 같은 문법을 쓸 수 있어 최종안으로 골랐다.'),
      ('02-overlap','겹친 한 칸','서로 다른 두 시간표가 겹치는 영역을 얼굴로 삼았다. 시간 입력과 일정 추천을 가장 직접적으로 전달하며 겹침 자체가 로고가 된다. 다만 겹친 레이어와 작은 얼굴을 함께 줄이면 32px에서 복잡해지고, 장소 조율과 이동시간의 공평함을 설명할 연결 고리가 약해 최종안에서 제외했다.'),
      ('03-table','우리 한자리','세 친구의 의자가 둥근 테이블로 모이는 환대의 장면이다. 사용자를 기다리고 자리를 마련하는 다정한 성격과 잘 맞는다. 반면 의자가 작은 크기에서 꽃잎으로 읽힐 여지가 있고 식당 예약 서비스로 오해할 수 있다. 이전 꽃구름과 실루엣의 거리를 충분히 벌리기 위해 선택하지 않았다.')]
    for file,name,paragraph in summaries: (ROOT/f'exploration/{file}.md').write_text(f'# {name}\n\n{paragraph}\n',encoding='utf-8')

    # Measured construction diagrams.
    b=rect(0,0,1000,720,P['light'])+text('마주의 구조',48,64,32,bold=True)+text('8px 기본 단위 / 240 × 240 캔버스 / 8px 외곽선',48,102,18)
    for i in range(31):
        v=140+i*1.75*8
        b+=path(f'M{v} 166 V586',stroke=P['line'],sw=1)
        b+=path(f'M140 {166+i*14} H560',stroke=P['line'],sw=1)
    b+=group(character(),140,166,1.75)
    b+=path('M350 148 V606 M120 376 H580',stroke=P['secondary'],sw=1.5,extra='stroke-dasharray="6 6"')
    for y,label in [(208,'머리: 128 × 128 / 곡률 32'),(260,'공통 구간: 88 × 48 / 곡률 24'),(312,'눈: 10 × 24 / 간격 24'),(364,'입: 6px, 눈과 같은 잉크색'),(416,'팔: 8px / 종점 반지름 9'),(468,'발: 20 × 38 / 신발 없음'),(520,'32px: 얼굴만 사용'),(572,'16px: 입과 외곽선 제거')]: b+=text(label,628,y,19,bold=y==520)
    b+=text('몸과 얼굴은 유지하고 눈, 입, 팔의 자세만 바꿔요.',48,672,21)
    save('character/construction.svg',1000,720,b,'마주 캐릭터 구성 그리드')
    b=rect(0,0,1100,660,P['light'])+text('합류점 로고의 구조',48,64,32,bold=True)+text('한글: 10px 획 / 영문: 8px 획을 닫힌 면으로 확장',48,103,18)
    for i in range(40): b+=path(f'M{56+i*24} 160 V416',stroke=P['line'],sw=1)
    for i in range(12): b+=path(f'M56 {160+i*24} H992',stroke=P['line'],sw=1)
    b+=group(head(symbol=True,outline=False),68,172,1.4)+group(ko(),366,220,2.4)
    b+=rect(61,165,239,239,'none',0,P['secondary'],2)+rect(350,200,560,216,'none',0,P['secondary'],2)
    b+=text('x = 심벌 캡슐 높이의 절반',48,492,21,bold=True)+text('사방 여백 ≥ x / 심벌과 글자 사이 ≥ x',48,534,21)
    b+=group(en(),580,470,1.1)+text('심벌과 워드마크는 정해진 비율로만 조합해요.',48,602,21)
    save('logo/construction.svg',1100,660,b,'모여락 로고 구성 그리드')

    # Product UI fragments.
    save('ui/speech-bubble.svg',390,194,group(speech(['3명이 응답했어요.','서연님 기다리는 중']),24,16),'마주 응답 현황 말풍선','AI 발화는 노란 면과 마주 이름으로 표시한다.')
    save('ui/suggestion-badge.svg',224,64,pill('마주가 제안해요',8,8,208,P['accent'],P['ink'],48,18),'마주의 제안 배지')
    b=rect(0,0,390,420,P['light'])+group(character('guide'),99,22,.8)+text('첫 약속을 만들어 볼까요?',195,258,24,bold=True,anchor='middle')+text('시간과 장소, 마주가 함께 정리해요.',195,292,16,anchor='middle')+button('모임 만들기',72,328,246)
    save('ui/empty-state.svg',390,420,b,'아직 모임이 없어요. 모임 만들기')
    b=rect(0,0,390,420,P['light'])+group(character('sorry'),99,14,.8)+text('장소 정보를 불러오지 못했어요',195,248,22,bold=True,anchor='middle')+text('연결된 지도 서비스가 잠시 응답하지 않아요.',195,280,15,anchor='middle')+text('남긴 시간과 출발지는 그대로예요.',195,305,15,anchor='middle')+button('다시 불러오기',72,332,246)
    save('ui/error-state.svg',390,420,b,'지도 서비스 연결 실패. 다시 불러오기')
    b=rect(0,0,390,320,P['light'])+group(character('thinking'),111,8,.7)+text('모두에게 맞는 지점을 찾고 있어요',195,222,21,bold=True,anchor='middle')+text('각자의 이동시간을 비교하고 있어요.',195,252,16,anchor='middle')
    for i in range(3): b+=circle(175+i*20,283,4,P['secondary'])
    save('ui/loading.svg',390,320,b,'중간지점 계산 중')

    # App icons: simplified symbol, optically expanded at 16/32.
    icon=rect(0,0,512,512,P['light'],112)+group(head(symbol=True,outline=False),0,0,3.2)
    save('app-icon/icon.svg',512,512,icon,'모여락 앱 아이콘')
    # Entire meaningful foreground fits inside radius 204.8 about 256,256.
    mask=rect(0,0,512,512,P['light'])+group(head(symbol=True,outline=False),80,80,2.2)
    save('app-icon/maskable.svg',512,512,mask,'모여락 마스커블 아이콘','중앙 반지름 40% 원 내부에 심벌 전체를 배치')
    tiny=path('M4 0 H12 Q16 0 16 4 V12 L12 16 H4 Q0 16 0 12 V4 Q0 0 4 0 Z',P['primary'])+rect(2,5,12,6,P['light'],3)+rect(5,6,2,4,P['ink'],1)+rect(9,6,2,4,P['ink'],1)
    save('app-icon/favicon.svg',16,16,tiny,'모여락 파비콘','16px 전용 픽셀 보정. 입과 외곽선 생략.')

    # Three actual 390x844 product compositions.
    b=phone_base()+app_header()+pill('링크 하나로 모이는 우리',24,128,190,P['accent'],P['ink'],32,13)
    b+=text('약속 잡는 일,',24,224,38,bold=True)+text('마주에게 맡겨요.',24,274,38,bold=True)
    b+=text('되는 시간만 말해 주세요.',24,318,18)+text('함께 만날 시간과 장소를 찾아드려요.',24,345,17)
    b+=route(42,401,1.54)+group(character('guide'),130,370,.94)
    b+=rect(24,615,342,80,P['paper'],20)+text('“담주 평일 저녁, 수요일 빼고”',42,648,17,bold=True)+text('이렇게 말하면 시간표에 담아드려요.',42,674,14,P['muted'])
    b+=button('모임 만들기',24,724,342)+text('로그인 없이 시작하고 카톡으로 함께해요.',195,805,13,P['muted'],False,'middle')
    save('mockups/01-landing.svg',390,844,b,'모여락 랜딩 화면')

    b=phone_base()+app_header(True)+text('오랜만에, 우리 넷',24,145,28,bold=True)+text('현호님이 만든 모임',24,176,15,P['muted'])
    b+=pill('시간 모으기',24,204,110,P['secondary'],P['light'])+pill('장소 모으기',140,204,110,P['line'],P['ink'])+pill('확정',256,204,66,P['line'],P['ink'])
    b+=speech(['3명이 응답했어요.','서연님 기다리는 중'],24,263,342,True)
    b+=text('함께하는 사람',24,456,20,bold=True)+text('3 / 4명 응답',366,456,14,P['secondary'],True,'end')
    for i,(name,done) in enumerate([('현호',True),('지민',True),('민수',True),('서연',False)]):
        x=24+i*88
        b+=rect(x,480,78,94,P['paper'],18)
        b+=circle(x+39,508,15,P['secondary'] if done else P['line'])
        b+=path(f'M{x+32} 508 L{x+37} 513 L{x+46} 503',stroke=P['light'],sw=3) if done else path(f'M{x+34} 508 H{x+44}',stroke=P['muted'],sw=3)
        b+=text(name,x+39,546,15,bold=True,anchor='middle')+text('응답 완료' if done else '기다리는 중',x+39,566,12,P['muted'],False,'middle')
    b+=rect(24,603,342,82,P['paper'],20)+text('지금 응답으로 먼저 제안받을까요?',42,634,17,bold=True)+text('서연님의 응답은 나중에 반영할 수 있어요.',42,662,14,P['muted'])
    b+=button('현재 응답으로 제안받기',24,714,342)+text('서연님에게 보낼 메시지 만들기',195,802,14,P['secondary'],True,'middle')
    save('mockups/02-meeting-home.svg',390,844,b,'모임 홈: 3명이 응답했어요. 서연님 기다리는 중')

    b=phone_base()+app_header(True)+text('우리, 여기서 만나요',24,145,28,bold=True)+text('모두의 시간과 출발지를 함께 살폈어요.',24,176,16,P['muted'])
    b+=rect(24,208,342,416,P['paper'],24)+pill('마주가 제안해요',44,228,150,P['accent'],P['ink'])+group(head('happy'),279,219,.4)
    b+=text('11월 1일 일요일',44,310,25,bold=True)+text('오후 2시',44,351,32,bold=True)
    b+=path('M44 377 H346',stroke=P['line'],sw=1)+circle(56,412,10,P['secondary'])+circle(56,412,4,P['light'])+text('홍대입구역',78,421,27,bold=True)
    b+=text('4명 모두 가능해요',44,464,17,P['secondary'],True)+text('각자 30분 안에 도착할 수 있어요.',44,493,15,P['muted'])
    b+=path('M64 560 H220 M142 530 V560',stroke=P['secondary'],sw=8)
    b+=circle(64,560,5,P['secondary'])+circle(220,560,5,P['secondary'])+circle(142,530,5,P['secondary'])+circle(142,560,14,P['paper'],P['secondary'],8)
    b+=text('합정',64,604,12,P['muted'],False,'middle')+text('홍대입구',142,604,12,P['muted'],False,'middle')+text('신촌',220,604,12,P['muted'],False,'middle')+text('이유 보기',310,591,14,P['secondary'],True,'middle')
    b+=button('이걸로 확정',24,660,342)+button('다른 제안 보기',24,728,342,True)+text('확정하면 단톡방에 보낼 요약을 만들어드려요.',195,804,12,P['muted'],False,'middle')
    save('mockups/03-suggestion.svg',390,844,b,'11월 1일 일요일 오후 2시 · 홍대입구역. 이걸로 확정','날짜와 장소를 두 줄로 나눠 작은 화면에서 읽기 쉽게 배치')

    # OG template preserves literal slots; rendered example is font-outlined.
    def og(sample=False):
        b=rect(0,0,1200,630,P['light'])+group(lockup(),52,40,.95)
        b+=pill('만날 약속이 도착했어요',64,192,270,P['accent'],P['ink'],42,18)
        if sample:
            b+=text('현호님의 모임',64,322,64,bold=True)+text('11월 1일 일요일 오후 2시',64,384,31)
        else:
            b+='<text id="host-slot" x="64" y="322" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="64" font-weight="700" fill="'+P['ink']+'">{호스트}님의 모임</text>'
            b+='<text id="date-slot" x="64" y="384" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="31" fill="'+P['ink']+'">{날짜 및 시간}</text>'
        b+=text('시간과 장소, 마주가 함께 정리해요.',64,524,24,P['muted'])
        b+=route(770,148,1.7)+group(character('guide'),792,162,1.45)
        return b
    save('og/og-template.svg',1200,630,og(),'모여락 모임 공유 템플릿','host-slot과 date-slot의 텍스트만 안전하게 치환해 사용한다.')
    save('og/og-default.svg',1200,630,og(True),'현호님의 모임 / 11월 1일 일요일 오후 2시','Apple SD Gothic Neo를 CoreText로 윤곽선 변환한 렌더링 샘플')

    # A composed, entirely vector, single-image overview.
    b=rect(0,0,1600,1910,P['light'])+text('모여락',64,92,28,bold=True)+text('서로의 시간을, 하나의 약속으로.',64,162,48,bold=True)
    b+=text('합류점이라는 새 얼굴 / Brand identity v2',64,210,22,P['muted'])
    b+=group(lockup(),64,266,1.65)+group(en(),74,460,1.1)
    b+=rect(850,256,686,270,P['dark'],32)+group(lockup(P['light'],True),918,322,1.5)+text('한 색으로도 같은 얼굴',896,491,18,P['light'])
    colors=[('홍시 / Primary','primary'),('숲 / Secondary','secondary'),('신호 / Assistant','accent'),('잉크 / Ink','ink'),('바탕 / Light','light'),('밤 / Dark','dark')]
    for i,(label,key) in enumerate(colors):
        x=64+i*248
        b+=rect(x,576,232,86,P[key],16,P['line'] if key=='light' else None)
        b+=text(label,x,695,17,bold=True)+text(P[key],x,722,17,P['muted'])
    b+=text('마주 / 약속을 연결하는 작은 역장',64,799,27,bold=True)
    for i,(exp,label) in enumerate(zip(EXP,LABELS)):
        x=60+i*248
        b+=group(character(exp),x,828,.9)+text(label,x+108,1072,18,anchor='middle')
    b+=rect(64,1122,850,724,P['dark'],32)+text('작아져도 또렷하게',100,1179,26,P['light'],True)
    for i,exp in enumerate(EXP):
        x=104+i*130
        b+=group(head(exp),x,1214,.55)+text(LABELS[i],x+44,1334,14,P['light'],False,'middle')
    b+=text('32px 실제 크기',104,1384,14,P['darkMuted'])
    for i,exp in enumerate(EXP): b+=group(head(exp),238+i*72,1359,.2)
    b+=rect(104,1431,176,176,P['light'],40)+group(head(symbol=True,outline=False),104,1431,1.1)
    b+=text('한눈에 모여락',318,1470,28,P['light'],True)+text('같은 합류점이 심벌과 앱 아이콘이 됩니다.',318,1510,19,P['darkMuted'])
    b+=group(speech(['되는 시간만 말해 주세요.','함께 만날 곳까지 찾아드릴게요.']),318,1542,1.38)
    b+=text('AI의 말은 노란색으로, 확정 행동은 짙은 녹색으로.',104,1788,19,P['light'])
    b+=rect(1027,1122,413,724,P['line'],40)
    # Miniature 390x844 screen with no image dependency.
    mock_inner=FILES['mockups/03-suggestion.svg'].split('</desc>',1)[1].rsplit('</svg>',1)[0]
    b+=group(mock_inner,1070,1140,.8)
    b+=text('제안이 결정으로 이어지는 화면',1234,1827,17,bold=True,anchor='middle')
    save('brand-board.svg',1600,1910,b,'모여락 새로운 브랜드 보드','로고, 여섯 색, 여섯 표정, 아바타, 앱 아이콘과 모바일 화면')


def english_request():
    c=[]
    def M(x,y): c.append(['M',x,y])
    def L(x,y): c.append(['L',x,y])
    def C(*n): c.append(['C',*n])
    # m: two arches; o: circular station; y: branching route; e: open ring.
    M(4,44);L(4,16); M(4,26);C(4,9,24,9,24,25);L(24,44);M(24,25);C(24,9,44,9,44,25);L(44,44)
    M(68,14);C(48,14,48,44,68,44);C(88,44,88,14,68,14)
    M(94,16);L(105,41);M(118,16);L(103,55);C(101,60,98,61,94,61)
    M(130,29);L(155,29);C(155,7,128,9,128,29);C(128,46,145,49,154,40)
    M(177,14);C(157,14,157,44,177,44);C(197,44,197,14,177,14)
    M(203,44);L(203,16);M(203,27);C(203,18,211,13,219,16)
    M(241,14);C(221,14,221,44,241,44);C(261,44,261,14,241,14);M(256,16);L(256,44)
    M(272,44);L(272,0);M(272,32);L(293,15);M(282,26);L(300,44)
    return dict(key='english',commands=c,stroke=8)


def finalize():
    create()
    binary=ROOT/'tools/vector_text'
    if not binary.exists():
        subprocess.run(['swiftc','-module-cache-path',str(ROOT/'tools/.swift-cache'),str(ROOT/'tools/vector_text.swift'),'-o',str(binary)],check=True)
    result=subprocess.run([str(binary)],input=json.dumps(list(TEXTS.values())+[english_request()]),text=True,capture_output=True,check=True)
    vectors={r['key']:r for r in json.loads(result.stdout)}
    assert all(r.get('missingGlyphs',0)==0 for r in vectors.values()),'Missing glyph'
    for name,content in FILES.items():
        for k in set(re.findall(r'__T([a-f0-9]+)__',content)):
            content=content.replace(f'__T{k}__',vectors[k]['d'])
        for match in set(re.findall(r'__X(\d+)__',content)):
            u=USES[int(match)]; w=vectors[u['k']]['width']
            x=u['x']-(w/2 if u['anchor']=='middle' else w if u['anchor']=='end' else 0)
            content=content.replace(f'__X{match}__',f'{x:.3f}')
        content=content.replace('__EN__',vectors['english']['d'])
        p=ROOT/name; p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')
    (ROOT/'qa/text-shaping.json').write_text(json.dumps(dict(font='AppleSDGothicNeo-Regular / AppleSDGothicNeo-Bold',strings=len(TEXTS),missingGlyphs=0),indent=2)+'\n')
    print(f'Wrote {len(FILES)} SVGs; {len(TEXTS)} outlined UI strings, no missing glyphs.')
    render()
    html()


def render():
    jobs=[('app-icon/icon.svg','app-icon/icon-512.png',512,512),('app-icon/icon.svg','app-icon/icon-192.png',192,192),('app-icon/icon.svg','app-icon/apple-touch-180.png',180,180),('app-icon/favicon.svg','app-icon/favicon-32.png',32,32),('app-icon/favicon.svg','app-icon/favicon-16.png',16,16),('app-icon/maskable.svg','app-icon/maskable-512.png',512,512),('og/og-default.svg','og/og-default.png',1200,630),('brand-board.svg','brand-board.png',1600,1910)]
    jobs += [(f'mockups/{n}.svg',f'mockups/{n}.png',390,844) for n in ['01-landing','02-meeting-home','03-suggestion']]
    for source,target,w,h in jobs:
        subprocess.run(['rsvg-convert','-w',str(w),'-h',str(h),str(ROOT/source),'-o',str(ROOT/target)],check=True,capture_output=True)
    print(f'Rendered {len(jobs)} PNGs with rsvg-convert.')


def html():
    def img(src,label,cls=''):
        return f'<figure class="{cls}"><a href="{src}"><img src="{src}" alt="{label}" loading="lazy"></a><figcaption>{label}<a href="{src}" download aria-label="{label} 다운로드">SVG ↓</a></figcaption></figure>'
    sections=''
    sections+='<section><h2>하나의 합류점, 두 가지 바탕</h2><div class="duo"><div class="tile">'+img('logo/lockup-horizontal.svg','가로 조합')+img('logo/wordmark-en.svg','영문 워드마크')+'</div><div class="tile dark">'+img('logo/lockup-horizontal-mono-white.svg','어두운 바탕 / 단색 흰색')+img('logo/symbol.svg','심벌 / 입과 외곽선을 덜어낸 합류점')+'</div></div></section>'
    sections+='<section><h2>색의 역할</h2><div class="palette">'
    for key,label in [('primary','브랜드 홍시'),('secondary','행동의 숲'),('accent','마주의 신호'),('ink','잉크'),('light','밝은 바탕'),('dark','밤 바탕')]:
        sections+=f'<div><span class="swatch" style="background:{P[key]}"></span><b>{label}</b><code>{P[key]}</code></div>'
    sections+='</div><p>마주가 말할 때는 노란색, 사용자가 결정할 때는 짙은 녹색을 씁니다. 실제 대비값과 다크 토큰은 <a href="BRAND.md">BRAND.md</a>에 있습니다.</p></section>'
    for dark in [False,True]:
        sections+=f'<section class="{"dark panel" if dark else ""}"><h2>마주의 여섯 표정 / {"밤" if dark else "낮"}</h2><div class="six">'
        for exp,label in zip(EXP,LABELS): sections+=img(f'character/expressions/{exp}.svg',label)
        sections+='</div><h3>얼굴 전용 / 32px 실제 크기</h3><div class="avatars">'
        for exp,label in zip(EXP,LABELS): sections+=img(f'character/avatar/{exp}.svg',label)
        sections+='</div></section>'
    sections+='<section><h2>쓰임에 맞춘 얼굴</h2><div class="four">'+img('character/motion/thinking-loop.svg','생각 중 / 1.6초, 움직임 줄이기 지원')+img('app-icon/icon.svg','앱 아이콘')+img('app-icon/maskable.svg','마스커블 / 중앙 80% 지름 안전 원')+img('app-icon/favicon.svg','16px 파비콘','favicon')+'</div><div class="downloads">'
    for n in ['icon-512','icon-192','apple-touch-180','favicon-32','favicon-16','maskable-512']: sections+=f'<a href="app-icon/{n}.png" download>{n}.png ↓</a>'
    sections+='</div></section><section><h2>마주가 화면에 들어오면</h2><div class="phones">'
    for name,label in [('01-landing','시작'),('02-meeting-home','모임 홈'),('03-suggestion','제안과 확정')]: sections+=img(f'mockups/{name}.svg',label)+f'<a class="pnglink" href="mockups/{name}.png" download>{label} PNG ↓</a>'
    sections+='</div></section><section><h2>말과 상태</h2><div class="three">'
    for name,label in [('speech-bubble','마주의 말풍선'),('suggestion-badge','제안 배지'),('loading','조건을 비교하는 중'),('empty-state','아직 모임이 없을 때'),('error-state','외부 서비스가 응답하지 않을 때')]: sections+=img(f'ui/{name}.svg',label)
    sections+='</div></section><section><h2>단톡방으로 돌아가는 약속</h2>'+img('og/og-default.svg','현호님의 모임 / 1200 × 630')+'<p><a href="og/og-template.svg">호스트와 날짜 슬롯이 있는 SVG 템플릿</a> / <a href="og/og-default.png">렌더링 샘플 PNG</a></p></section><section><h2>탐색한 세 가지 출발점</h2><div class="three">'
    for name,label in [('01-junction','합류점 / 선택'),('02-overlap','겹친 한 칸'),('03-table','우리 한자리')]: sections+=img(f'exploration/{name}.svg',label)
    sections+='</div></section><section><h2>제작 규칙과 로고 원본</h2><div class="duo">'+img('logo/construction.svg','로고의 구성 그리드')+img('character/construction.svg','캐릭터의 구성 그리드')+'</div><div class="three">'+img('logo/wordmark-ko.svg','한글 워드마크')+img('logo/lockup-vertical.svg','세로 조합')+img('logo/lockup-horizontal-mono-black.svg','단색 검정')+'</div></section>'
    page='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>모여락 — 합류점, 마주</title><link rel="stylesheet" href="tokens.css"><style>
*{box-sizing:border-box}body{margin:0;background:var(--brand-surface-light);color:var(--brand-ink);font-family:Pretendard,"Apple SD Gothic Neo",sans-serif;line-height:1.65}main{max-width:1400px;margin:auto;padding:56px 40px 80px}header{padding:30px 0 44px;border-bottom:2px solid var(--brand-ink)}h1{font-size:clamp(32px,4.5vw,62px);line-height:1.25;letter-spacing:-.045em;margin:22px 0}h2{font-size:28px;letter-spacing:-.03em;margin:0 0 28px}h3{font-size:16px;margin:30px 0 18px}p{max-width:760px;color:var(--brand-muted)}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid var(--brand-secondary);outline-offset:6px}nav,.downloads{display:flex;gap:20px;flex-wrap:wrap}nav a,.downloads a{font-size:14px}section{margin-top:64px}figure{margin:0;min-width:0}figure img{display:block;max-width:100%;width:100%;height:100%;max-height:270px;object-fit:contain}figure>a{display:flex;align-items:center;justify-content:center;min-height:170px}figcaption{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding-top:16px;line-height:1.5}figcaption a{opacity:.65;white-space:nowrap}.duo,.three,.four,.six,.palette{display:grid;gap:24px}.duo{grid-template-columns:1fr 1fr}.three{grid-template-columns:repeat(3,1fr);gap:36px}.four{grid-template-columns:repeat(4,1fr)}.six,.palette{grid-template-columns:repeat(6,1fr)}.tile{background:white;border-radius:28px;padding:32px}.tile figure+a{margin-top:10px}.tile figure img{max-height:125px}.dark{background:var(--brand-surface-dark);color:var(--brand-on-dark)}.panel{padding:32px;border-radius:28px}.panel p{color:var(--brand-muted-dark)}.swatch{display:block;height:88px;border-radius:16px;margin-bottom:14px;outline:1px solid #20292312}.palette b,.palette code{display:block;font-size:14px}.avatars{display:flex;justify-content:space-between;gap:32px}.avatars img{width:32px;height:32px}.avatars figure{flex:1}.avatars figure>a{min-height:48px;justify-content:flex-start}.avatars figcaption{display:block}.avatars figcaption a{display:block}.phones{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 40px}.phones figure{grid-row:1}.phones img{max-height:none;border-radius:32px;border:1px solid var(--brand-line)}.phones .pnglink{grid-row:2;font-size:13px}.downloads{margin-top:20px}.favicon img{width:16px;height:16px;image-rendering:pixelated}footer{margin-top:80px;padding-top:24px;border-top:1px solid var(--brand-line);font-size:14px}header img{width:200px} .three figure img{max-height:320px}section>figure img{max-height:600px}section>figure>a{display:block}
@media(max-width:800px){main{padding:24px 20px 48px}.duo,.three,.four{grid-template-columns:1fr 1fr}.six,.palette{grid-template-columns:repeat(3,1fr)}.phones{display:flex;flex-direction:column;align-items:center}.phones figure{max-width:390px}.avatars{flex-wrap:wrap;gap:24px}.avatars figure{flex:0 0 23%}.panel{padding:24px}.tile{padding:20px}h2{font-size:24px}}@media(max-width:460px){.duo,.three{grid-template-columns:1fr}.six{grid-template-columns:repeat(2,1fr)}.palette{gap:16px}.palette b{font-size:12px}figcaption{font-size:12px}section{margin-top:48px}}
</style></head><body><main><header><img src="logo/lockup-horizontal.svg" alt="모여락"><h1>서로의 시간을,<br>하나의 약속으로.</h1><p>합류점에서 태어난 새 얼굴, 마주. 시간과 장소를 조율하고 마지막 확정까지 함께하는 모여락의 두 번째 브랜드입니다.</p><nav><a href="BRAND.md">브랜드 가이드</a><a href="tokens.css">컬러 토큰</a><a href="brand-board.png">전체 보드 PNG</a><a href="qa/verification.json">검증 결과</a></nav></header>'''+sections+'''<footer>모여락 Brand v2 / 합류점 / 마주<br>로고의 글자와 샘플 UI 문구는 모두 벡터 윤곽선입니다. OG 템플릿의 두 슬롯만 편집 가능한 텍스트로 남겼습니다.</footer></main></body></html>'''
    (ROOT/'index.html').write_text(page,encoding='utf-8')


if __name__=='__main__': finalize()
