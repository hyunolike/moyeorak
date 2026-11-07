-- 0006에서 카카오로 찾지 못한 역과, 이름이 겹치는 역을 정리한다.
-- 경의중앙선에는 신길역과 행주역이 없다.
DELETE FROM stations WHERE name = '신길' AND line = '경의중앙선';
--> statement-breakpoint
DELETE FROM stations WHERE name = '행주' AND line = '경의중앙선';
--> statement-breakpoint
-- 이름이 바뀐 역. 이름과 좌표는 카카오 지하철역 검색(2026-11-08) 기준이다.
UPDATE stations SET name = '불암산', geom = ST_SetSRID(ST_MakePoint(127.079067, 37.670218), 4326) WHERE name = '당고개' AND line = '4호선';
--> statement-breakpoint
UPDATE stations SET name = '자양' WHERE name = '뚝섬유원지' AND line = '7호선';
--> statement-breakpoint
UPDATE stations SET name = '평택지제', geom = ST_SetSRID(ST_MakePoint(127.070514, 37.018902), 4326) WHERE name = '지제' AND line = '1호선';
--> statement-breakpoint
UPDATE stations SET name = '서해구청', geom = ST_SetSRID(ST_MakePoint(126.676844, 37.544045), 4326) WHERE name = '서구청' AND line = '인천2호선';
--> statement-breakpoint
-- 5호선 양평(서울 영등포구)과 53km 떨어진 다른 역이다. 가게 수가 이름으로 묶여서 이름을 나눈다.
UPDATE stations SET name = '양평(경기)' WHERE name = '양평' AND line = '경의중앙선';
--> statement-breakpoint
-- 위 역들의 가게 수는 옛 이름이나 섞인 좌표로 센 값이라 지운다. pnpm stations:venues로 다시 센다.
DELETE FROM station_venues WHERE station_name IN ('행주', '당고개', '뚝섬유원지', '양평', '지제', '서구청');
