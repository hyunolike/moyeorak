-- 0001 시드 좌표 중 카카오 지하철역 검색(SW8)과 200m 넘게 차이 나는 403개 역을 바로잡는다.
-- pnpm stations:coords 로 만든 결과다. 2026-11-08 기준.
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.054928, 37.927613), 4326) WHERE name = '동두천' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.057181, 37.914144), 4326) WHERE name = '보산' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.056423, 37.901781), 4326) WHERE name = '동두천중앙' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.055793, 37.892343), 4326) WHERE name = '지행' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.061559, 37.843188), 4326) WHERE name = '덕정' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.056692, 37.818753), 4326) WHERE name = '덕계' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.044721, 37.774142), 4326) WHERE name = '양주' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.042279, 37.759385), 4326) WHERE name = '녹양' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.044288, 37.748396), 4326) WHERE name = '가능' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.047295, 37.723806), 4326) WHERE name = '회룡' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.047418, 37.710219), 4326) WHERE name = '망월사' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.045535, 37.679212), 4326) WHERE name = '도봉' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.044322, 37.667438), 4326) WHERE name = '방학' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.051382, 37.644633), 4326) WHERE name = '녹천' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.058857, 37.633278), 4326) WHERE name = '월계' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.061695, 37.623837), 4326) WHERE name = '광운대' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.065689, 37.615006), 4326) WHERE name = '석계' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.067398, 37.601782), 4326) WHERE name = '신이문' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.063693, 37.596274), 4326) WHERE name = '외대앞' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.034949, 37.578173), 4326) WHERE name = '제기동' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.016364, 37.573217), 4326) WHERE name = '동묘앞' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.001538, 37.570976), 4326) WHERE name = '종로5가' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.918367, 37.516787), 4326) WHERE name = '신길' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.869691, 37.496255), 4326) WHERE name = '구일' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.858716, 37.494642), 4326) WHERE name = '개봉' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.844807, 37.494397), 4326) WHERE name = '오류동' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.795647, 37.482801), 4326) WHERE name = '소사' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.740730, 37.488477), 4326) WHERE name = '부개' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.707294, 37.483342), 4326) WHERE name = '백운' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.702890, 37.470696), 4326) WHERE name = '동암' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.693519, 37.464706), 4326) WHERE name = '간석' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.668576, 37.466118), 4326) WHERE name = '도화' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.657494, 37.466819), 4326) WHERE name = '제물포' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.642535, 37.468773), 4326) WHERE name = '도원' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.889478, 37.465974), 4326) WHERE name = '독산' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.893609, 37.456194), 4326) WHERE name = '금천구청' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.902321, 37.435093), 4326) WHERE name = '석수' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.908500, 37.419568), 4326) WHERE name = '관악' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.935593, 37.384460), 4326) WHERE name = '명학' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.943270, 37.372337), 4326) WHERE name = '금정' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.948518, 37.354192), 4326) WHERE name = '군포' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.948371, 37.343690), 4326) WHERE name = '당정' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.947977, 37.320342), 4326) WHERE name = '의왕' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.971022, 37.300329), 4326) WHERE name = '성균관대' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.989612, 37.284002), 4326) WHERE name = '화서' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.013800, 37.243873), 4326) WHERE name = '세류' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.033202, 37.206755), 4326) WHERE name = '병점' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.043427, 37.187135), 4326) WHERE name = '세마' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.063076, 37.169350), 4326) WHERE name = '오산대' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.066630, 37.144717), 4326) WHERE name = '오산' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.062356, 37.110079), 4326) WHERE name = '진위' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.054280, 37.075713), 4326) WHERE name = '송탄' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.052882, 37.056564), 4326) WHERE name = '서정리' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.126837, 36.915953), 4326) WHERE name = '성환' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.143824, 36.870933), 4326) WHERE name = '직산' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.148943, 36.833981), 4326) WHERE name = '두정' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.146489, 36.810523), 4326) WHERE name = '천안' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.136038, 36.801420), 4326) WHERE name = '봉명' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.121378, 36.793726), 4326) WHERE name = '쌍용' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.104077, 36.792117), 4326) WHERE name = '아산' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.951393, 36.769642), 4326) WHERE name = '신창' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.975598, 37.563682), 4326) WHERE name = '시청' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.990984, 37.566291), 4326) WHERE name = '을지로3가' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.997632, 37.566641), 4326) WHERE name = '을지로4가' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.007662, 37.491850), 4326) WHERE name = '서초' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.050890, 37.562123), 4326) WHERE name = '용답' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.047080, 37.569839), 4326) WHERE name = '신답' AND line = '2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.747501, 37.676157), 4326) WHERE name = '대화' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.761264, 37.670149), 4326) WHERE name = '주엽' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.773406, 37.659481), 4326) WHERE name = '정발산' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.777611, 37.652241), 4326) WHERE name = '마두' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.788132, 37.642962), 4326) WHERE name = '백석' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.810931, 37.631697), 4326) WHERE name = '대곡' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.842918, 37.653110), 4326) WHERE name = '원당' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.873025, 37.650692), 4326) WHERE name = '원흥' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.895734, 37.653265), 4326) WHERE name = '삼송' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.913854, 37.648149), 4326) WHERE name = '지축' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.918853, 37.636436), 4326) WHERE name = '구파발' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.935828, 37.600807), 4326) WHERE name = '녹번' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.944158, 37.588795), 4326) WHERE name = '홍제' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.950231, 37.582563), 4326) WHERE name = '무악재' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.992615, 37.566431), 4326) WHERE name = '을지로3가' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.005316, 37.559056), 4326) WHERE name = '동대입구' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.016200, 37.485200), 4326) WHERE name = '남부터미널' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.046711, 37.486939), 4326) WHERE name = '매봉' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.071167, 37.496885), 4326) WHERE name = '학여울' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.079528, 37.493708), 4326) WHERE name = '대청' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.084130, 37.483989), 4326) WHERE name = '일원' AND line = '3호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.073422, 37.660721), 4326) WHERE name = '상계' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.034656, 37.648543), 4326) WHERE name = '쌍문' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.026041, 37.626654), 4326) WHERE name = '미아' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.030087, 37.613278), 4326) WHERE name = '미아사거리' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.025060, 37.603395), 4326) WHERE name = '길음' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.974520, 37.522373), 4326) WHERE name = '이촌' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.980315, 37.502980), 4326) WHERE name = '동작' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.982212, 37.486800), 4326) WHERE name = '총신대입구' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.002229, 37.451748), 4326) WHERE name = '선바위' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.007838, 37.443963), 4326) WHERE name = '경마공원' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.006752, 37.436056), 4326) WHERE name = '대공원' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.996617, 37.432875), 4326) WHERE name = '과천' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.989868, 37.426505), 4326) WHERE name = '정부과천청사' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.976680, 37.401494), 4326) WHERE name = '인덕원' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.963808, 37.394240), 4326) WHERE name = '평촌' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.943473, 37.372468), 4326) WHERE name = '금정' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.933046, 37.358019), 4326) WHERE name = '산본' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.916898, 37.327965), 4326) WHERE name = '대야미' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.903824, 37.312382), 4326) WHERE name = '반월' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.866606, 37.302852), 4326) WHERE name = '상록수' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.854023, 37.309429), 4326) WHERE name = '한대앞' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.838830, 37.315995), 4326) WHERE name = '중앙' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.823599, 37.316769), 4326) WHERE name = '고잔' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.806473, 37.320440), 4326) WHERE name = '초지' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.789216, 37.326859), 4326) WHERE name = '안산' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.767522, 37.337375), 4326) WHERE name = '신길온천' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.743350, 37.351701), 4326) WHERE name = '정왕' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.738404, 37.361703), 4326) WHERE name = '오이도' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.806814, 37.572537), 4326) WHERE name = '개화산' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.812430, 37.561161), 4326) WHERE name = '송정' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.840455, 37.541651), 4326) WHERE name = '화곡' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.864625, 37.526135), 4326) WHERE name = '목동' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.886419, 37.525580), 4326) WHERE name = '양평' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.905180, 37.522709), 4326) WHERE name = '영등포시장' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.945863, 37.539554), 4326) WHERE name = '마포' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.956669, 37.553413), 4326) WHERE name = '애오개' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.990418, 37.572589), 4326) WHERE name = '종로3가' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.998045, 37.567564), 4326) WHERE name = '을지로4가' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.005792, 37.564622), 4326) WHERE name = '동대문역사문화공원' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.020493, 37.554476), 4326) WHERE name = '신금호' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.029512, 37.557364), 4326) WHERE name = '행당' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.042985, 37.566139), 4326) WHERE name = '마장' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.089565, 37.552249), 4326) WHERE name = '아차산' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.132396, 37.535882), 4326) WHERE name = '강동' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.140021, 37.537826), 4326) WHERE name = '길동' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.142884, 37.545518), 4326) WHERE name = '굽은다리' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.144044, 37.551398), 4326) WHERE name = '명일' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.165906, 37.556678), 4326) WHERE name = '상일동' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.130964, 37.516339), 4326) WHERE name = '올림픽공원' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.126096, 37.508751), 4326) WHERE name = '방이' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.135080, 37.497968), 4326) WHERE name = '개롱' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.152860, 37.495038), 4326) WHERE name = '마천' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.223219, 37.539803), 4326) WHERE name = '하남검단산' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.204007, 37.552290), 4326) WHERE name = '하남풍산' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.206298, 37.541978), 4326) WHERE name = '하남시청' AND line = '5호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.915540, 37.598493), 4326) WHERE name = '응암' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.922844, 37.606227), 4326) WHERE name = '역촌' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.933054, 37.618414), 4326) WHERE name = '독바위' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.917259, 37.611247), 4326) WHERE name = '구산' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.913581, 37.590860), 4326) WHERE name = '새절' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.909495, 37.583746), 4326) WHERE name = '증산' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.932030, 37.547486), 4326) WHERE name = '광흥창' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.942473, 37.547648), 4326) WHERE name = '대흥' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.994334, 37.534525), 4326) WHERE name = '이태원' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.001765, 37.539791), 4326) WHERE name = '한강진' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.006731, 37.547828), 4326) WHERE name = '버티고개' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.015297, 37.579415), 4326) WHERE name = '창신' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.020004, 37.585542), 4326) WHERE name = '보문' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.036308, 37.590442), 4326) WHERE name = '고려대' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.041461, 37.601804), 4326) WHERE name = '월곡' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.048829, 37.606559), 4326) WHERE name = '상월곡' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.066703, 37.615149), 4326) WHERE name = '석계' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.083542, 37.619842), 4326) WHERE name = '화랑대' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.091360, 37.617351), 4326) WHERE name = '봉화산' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.104271, 37.612491), 4326) WHERE name = '신내' AND line = '6호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.052818, 37.699955), 4326) WHERE name = '장암' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.055351, 37.677881), 4326) WHERE name = '수락산' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.057713, 37.665202), 4326) WHERE name = '마들' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.064110, 37.645092), 4326) WHERE name = '중계' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.077762, 37.610619), 4326) WHERE name = '먹골' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.079312, 37.602553), 4326) WHERE name = '중화' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.088505, 37.580940), 4326) WHERE name = '사가정' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.086720, 37.573668), 4326) WHERE name = '용마산' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.011586, 37.508161), 4326) WHERE name = '반포' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.993600, 37.487659), 4326) WHERE name = '내방' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.953622, 37.496317), 4326) WHERE name = '숭실대입구' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.947918, 37.502871), 4326) WHERE name = '상도' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.939072, 37.504899), 4326) WHERE name = '장승배기' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.928211, 37.499757), 4326) WHERE name = '신대방삼거리' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.920612, 37.499921), 4326) WHERE name = '보라매' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.909754, 37.500123), 4326) WHERE name = '신풍' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.868211, 37.476193), 4326) WHERE name = '철산' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.854874, 37.479298), 4326) WHERE name = '광명사거리' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.838605, 37.486856), 4326) WHERE name = '천왕' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.811340, 37.506227), 4326) WHERE name = '까치울' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.797235, 37.505426), 4326) WHERE name = '부천종합운동장' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.764014, 37.504656), 4326) WHERE name = '부천시청' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.776898, 37.502952), 4326) WHERE name = '신중동' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.786998, 37.503699), 4326) WHERE name = '춘의' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.703544, 37.508607), 4326) WHERE name = '산곡' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.676149, 37.506243), 4326) WHERE name = '석남' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.120444, 37.530211), 4326) WHERE name = '강동구청' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.112865, 37.517806), 4326) WHERE name = '몽촌토성' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.103271, 37.514312), 4326) WHERE name = '잠실' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.112194, 37.499715), 4326) WHERE name = '송파' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.149942, 37.456881), 4326) WHERE name = '산성' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.159883, 37.451669), 4326) WHERE name = '남한산성입구' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.156770, 37.445022), 4326) WHERE name = '단대오거리' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.147538, 37.440923), 4326) WHERE name = '신흥' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.140535, 37.437378), 4326) WHERE name = '수진' AND line = '8호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.796891, 37.578345), 4326) WHERE name = '개화' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.810610, 37.563689), 4326) WHERE name = '공항시장' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.817238, 37.567487), 4326) WHERE name = '신방화' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.827421, 37.566713), 4326) WHERE name = '마곡나루' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.841979, 37.568081), 4326) WHERE name = '양천향교' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.860637, 37.558133), 4326) WHERE name = '증미' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.883096, 37.544288), 4326) WHERE name = '신목동' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.893334, 37.538159), 4326) WHERE name = '선유도' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.928375, 37.517373), 4326) WHERE name = '샛강' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.953096, 37.512672), 4326) WHERE name = '노들' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.963463, 37.509165), 4326) WHERE name = '흑석' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.978103, 37.502941), 4326) WHERE name = '동작' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.987465, 37.501440), 4326) WHERE name = '구반포' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.996082, 37.503509), 4326) WHERE name = '신반포' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.015272, 37.504233), 4326) WHERE name = '사평' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.044015, 37.510324), 4326) WHERE name = '선정릉' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.053044, 37.512961), 4326) WHERE name = '삼성중앙' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.076324, 37.511410), 4326) WHERE name = '종합운동장' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.087364, 37.504549), 4326) WHERE name = '삼전' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.096508, 37.502462), 4326) WHERE name = '석촌고분' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.112662, 37.511017), 4326) WHERE name = '송파나루' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.116449, 37.516538), 4326) WHERE name = '한성백제' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.130253, 37.516116), 4326) WHERE name = '올림픽공원' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.138652, 37.519408), 4326) WHERE name = '둔촌오륜' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.148412, 37.528403), 4326) WHERE name = '중앙보훈병원' AND line = '9호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.787395, 37.854627), 4326) WHERE name = '문산' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.767163, 37.725602), 4326) WHERE name = '운정' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.765410, 37.751339), 4326) WHERE name = '금릉' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.774633, 37.766227), 4326) WHERE name = '금촌' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.792586, 37.796215), 4326) WHERE name = '월롱' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.792691, 37.815366), 4326) WHERE name = '파주' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.761454, 37.712611), 4326) WHERE name = '야당' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.761078, 37.693989), 4326) WHERE name = '탄현' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.769508, 37.682229), 4326) WHERE name = '일산' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.786084, 37.672668), 4326) WHERE name = '풍산' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.794334, 37.658536), 4326) WHERE name = '백마' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.801603, 37.646079), 4326) WHERE name = '곡산' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.810009, 37.631950), 4326) WHERE name = '대곡' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.820634, 37.618987), 4326) WHERE name = '능곡' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.834288, 37.612122), 4326) WHERE name = '행신' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.844498, 37.612290), 4326) WHERE name = '강매' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.914815, 37.568743), 4326) WHERE name = '가좌' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.942089, 37.559675), 4326) WHERE name = '신촌' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.935508, 37.552138), 4326) WHERE name = '서강대' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.927119, 37.557449), 4326) WHERE name = '홍대입구' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.952720, 37.542474), 4326) WHERE name = '공덕' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.971318, 37.556933), 4326) WHERE name = '서울역' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.973544, 37.522413), 4326) WHERE name = '이촌' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.988411, 37.519568), 4326) WHERE name = '서빙고' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.009209, 37.529429), 4326) WHERE name = '한남' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.034484, 37.549953), 4326) WHERE name = '응봉' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.075680, 37.594843), 4326) WHERE name = '중랑' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.107946, 37.606606), 4326) WHERE name = '양원' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.143351, 37.603269), 4326) WHERE name = '구리' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.161179, 37.608773), 4326) WHERE name = '도농' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.194669, 37.604028), 4326) WHERE name = '양정' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.208843, 37.586890), 4326) WHERE name = '덕소' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.222684, 37.579639), 4326) WHERE name = '도심' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.243966, 37.547359), 4326) WHERE name = '팔당' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.310232, 37.554643), 4326) WHERE name = '운길산' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.492248, 37.492684), 4326) WHERE name = '양평' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.546559, 37.468782), 4326) WHERE name = '원덕' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.593795, 37.481802), 4326) WHERE name = '용문' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.628906, 37.476907), 4326) WHERE name = '지평' AND line = '경의중앙선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.043627, 37.510933), 4326) WHERE name = '선정릉' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.052910, 37.496286), 4326) WHERE name = '한티' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.059493, 37.487027), 4326) WHERE name = '구룡' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.066121, 37.489139), 4326) WHERE name = '개포동' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.073070, 37.491550), 4326) WHERE name = '대모산입구' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.126578, 37.469042), 4326) WHERE name = '복정' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.126697, 37.448562), 4326) WHERE name = '가천대' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.127750, 37.439789), 4326) WHERE name = '태평' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.129132, 37.432057), 4326) WHERE name = '모란' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.128288, 37.396209), 4326) WHERE name = '이매' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.114289, 37.378469), 4326) WHERE name = '수내' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.108097, 37.366174), 4326) WHERE name = '정자' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.108949, 37.339831), 4326) WHERE name = '오리' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.108337, 37.312775), 4326) WHERE name = '보정' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.105696, 37.298979), 4326) WHERE name = '구성' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.111285, 37.286148), 4326) WHERE name = '신갈' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.115955, 37.275497), 4326) WHERE name = '기흥' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.108737, 37.261812), 4326) WHERE name = '상갈' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.078969, 37.259540), 4326) WHERE name = '청명' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.071332, 37.251504), 4326) WHERE name = '영통' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.057325, 37.245654), 4326) WHERE name = '망포' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.040809, 37.252506), 4326) WHERE name = '매탄권선' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.030857, 37.261923), 4326) WHERE name = '수원시청' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.015890, 37.265483), 4326) WHERE name = '매교' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.980573, 37.249772), 4326) WHERE name = '고색' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.963903, 37.243360), 4326) WHERE name = '오목천' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.908801, 37.250088), 4326) WHERE name = '어천' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.883775, 37.261424), 4326) WHERE name = '야목' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.857104, 37.290641), 4326) WHERE name = '사리' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.745403, 37.380027), 4326) WHERE name = '달월' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.742708, 37.391821), 4326) WHERE name = '월곶' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.733492, 37.400940), 4326) WHERE name = '소래포구' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.722452, 37.400659), 4326) WHERE name = '인천논현' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.708683, 37.401642), 4326) WHERE name = '호구포' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.695227, 37.407742), 4326) WHERE name = '남동인더스파크' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.686458, 37.413212), 4326) WHERE name = '원인재' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.678747, 37.417928), 4326) WHERE name = '연수' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.654676, 37.429962), 4326) WHERE name = '송도' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.649763, 37.448339), 4326) WHERE name = '인하대' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.638410, 37.460800), 4326) WHERE name = '숭의' AND line = '수인분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.038471, 37.470133), 4326) WHERE name = '양재시민의숲' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.054720, 37.448355), 4326) WHERE name = '청계산입구' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.108519, 37.367327), 4326) WHERE name = '정자' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.102870, 37.337843), 4326) WHERE name = '동천' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.094659, 37.322493), 4326) WHERE name = '수지구청' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.080384, 37.313532), 4326) WHERE name = '성복' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.069364, 37.297829), 4326) WHERE name = '상현' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.051726, 37.288384), 4326) WHERE name = '광교중앙' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.044269, 37.302112), 4326) WHERE name = '광교' AND line = '신분당선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.048636, 37.581273), 4326) WHERE name = '청량리' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.076790, 37.595083), 4326) WHERE name = '중랑' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.103225, 37.612705), 4326) WHERE name = '신내' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.114761, 37.634069), 4326) WHERE name = '갈매' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.143537, 37.648266), 4326) WHERE name = '퇴계원' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.176926, 37.651124), 4326) WHERE name = '사릉' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.207534, 37.637355), 4326) WHERE name = '금곡' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.244439, 37.653214), 4326) WHERE name = '평내호평' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.285063, 37.659228), 4326) WHERE name = '천마산' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.311687, 37.652792), 4326) WHERE name = '마석' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.379706, 37.683990), 4326) WHERE name = '대성리' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.426623, 37.735516), 4326) WHERE name = '청평' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.454516, 37.770178), 4326) WHERE name = '상천' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.510739, 37.814520), 4326) WHERE name = '가평' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.557770, 37.832066), 4326) WHERE name = '굴봉산' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.589325, 37.830792), 4326) WHERE name = '백양리' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.634152, 37.805722), 4326) WHERE name = '강촌' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.714324, 37.818449), 4326) WHERE name = '김유정' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.723851, 37.864047), 4326) WHERE name = '남춘천' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.716699, 37.884513), 4326) WHERE name = '춘천' AND line = '경춘선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.969750, 37.553329), 4326) WHERE name = '서울역' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.952602, 37.542315), 4326) WHERE name = '공덕' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.927010, 37.557305), 4326) WHERE name = '홍대입구' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.897882, 37.577521), 4326) WHERE name = '디지털미디어시티' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.736274, 37.571771), 4326) WHERE name = '계양' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.673642, 37.569253), 4326) WHERE name = '검암' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.624660, 37.556464), 4326) WHERE name = '청라국제도시' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.524974, 37.512029), 4326) WHERE name = '영종' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.477516, 37.459061), 4326) WHERE name = '공항화물청사' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.452585, 37.447529), 4326) WHERE name = '인천공항1터미널' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.433643, 37.468801), 4326) WHERE name = '인천공항2터미널' AND line = '공항철도';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.810475, 37.632406), 4326) WHERE name = '대곡' AND line = 'GTX-A';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.748257, 37.665243), 4326) WHERE name = '킨텍스' AND line = 'GTX-A';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.127319, 37.394714), 4326) WHERE name = '이매' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.203384, 37.408687), 4326) WHERE name = '삼동' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.253283, 37.398944), 4326) WHERE name = '경기광주' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.299905, 37.373379), 4326) WHERE name = '초월' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.346251, 37.350540), 4326) WHERE name = '곤지암' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.405243, 37.315613), 4326) WHERE name = '신둔도예촌' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.442168, 37.264226), 4326) WHERE name = '이천' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.490322, 37.260392), 4326) WHERE name = '부발' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.570660, 37.293633), 4326) WHERE name = '세종대왕릉' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.628529, 37.282860), 4326) WHERE name = '여주' AND line = '경강선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.736335, 37.571518), 4326) WHERE name = '계양' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.742679, 37.566299), 4326) WHERE name = '귤현' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.745067, 37.553661), 4326) WHERE name = '박촌' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.738633, 37.545012), 4326) WHERE name = '임학' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.727731, 37.543308), 4326) WHERE name = '계산' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.722631, 37.538124), 4326) WHERE name = '경인교대입구' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.722561, 37.530271), 4326) WHERE name = '작전' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.721551, 37.517118), 4326) WHERE name = '갈산' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.722285, 37.498364), 4326) WHERE name = '부평시장' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.718606, 37.485507), 4326) WHERE name = '동수' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.710294, 37.477835), 4326) WHERE name = '부평삼거리' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.707918, 37.467083), 4326) WHERE name = '간석오거리' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.702236, 37.457736), 4326) WHERE name = '인천시청' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.700916, 37.448526), 4326) WHERE name = '예술회관' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.699695, 37.441917), 4326) WHERE name = '인천터미널' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.698449, 37.434651), 4326) WHERE name = '문학경기장' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.698923, 37.426947), 4326) WHERE name = '선학' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.694020, 37.418108), 4326) WHERE name = '신연수' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.687889, 37.412369), 4326) WHERE name = '원인재' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.680851, 37.404576), 4326) WHERE name = '동춘' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.673448, 37.397942), 4326) WHERE name = '동막' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.662206, 37.388443), 4326) WHERE name = '캠퍼스타운' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.656299, 37.382281), 4326) WHERE name = '테크노파크' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.645861, 37.377507), 4326) WHERE name = '지식정보단지' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.630542, 37.399658), 4326) WHERE name = '국제업무지구' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.626018, 37.406920), 4326) WHERE name = '송도달빛축제공원' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.634989, 37.392846), 4326) WHERE name = '센트럴파크' AND line = '인천1호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.656438, 37.601660), 4326) WHERE name = '검단사거리' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.667221, 37.597635), 4326) WHERE name = '마전' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.673034, 37.592841), 4326) WHERE name = '완정' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.676003, 37.584848), 4326) WHERE name = '독정' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.675675, 37.568677), 4326) WHERE name = '검암' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.677531, 37.561126), 4326) WHERE name = '검바위' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.677106, 37.551314), 4326) WHERE name = '아시아드경기장' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.676822, 37.517526), 4326) WHERE name = '가정중앙시장' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.675359, 37.524818), 4326) WHERE name = '가정' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.676300, 37.507474), 4326) WHERE name = '석남' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.675868, 37.500345), 4326) WHERE name = '서부여성회관' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.675243, 37.489835), 4326) WHERE name = '인천가좌' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.681220, 37.473913), 4326) WHERE name = '주안국가산단' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.681075, 37.458385), 4326) WHERE name = '시민공원' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.692353, 37.457669), 4326) WHERE name = '석바위시장' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.701104, 37.456913), 4326) WHERE name = '인천시청' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.710422, 37.456788), 4326) WHERE name = '석천사거리' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.719622, 37.455863), 4326) WHERE name = '모래내시장' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.731736, 37.454976), 4326) WHERE name = '만수' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.736566, 37.448175), 4326) WHERE name = '남동구청' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.752852, 37.448477), 4326) WHERE name = '인천대공원' AND line = '인천2호선';
--> statement-breakpoint
UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(126.759607, 37.439643), 4326) WHERE name = '운연' AND line = '인천2호선';
