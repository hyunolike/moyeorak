# 모여락 Moyeorak

> 모두의 시간과 위치를 모아, 가장 만나기 좋은 약속을 정하는 모임 조율 서비스

모여락은 여러 명이 함께 만날 때 필요한 일정 조율과 장소 조율을 한 흐름에서 처리합니다. 참여자는 가능한 시간을 투표하고 출발지를 등록할 수 있으며, 서비스는 함께 만나기 좋은 시간과 중간 지점, 주변 장소, 개인별 이동 경로를 제공합니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 모임 생성 및 초대 | 일정 조율 또는 장소 조율 흐름으로 모임을 만들고 링크로 참여자를 초대합니다. |
| 일정 투표 | 참여자가 가능한 날짜와 시간을 입력하면 겹치는 시간대를 확인합니다. |
| 최적 시간 확인 | 투표 결과를 기반으로 함께 가능한 추천 시간대를 제공합니다. |
| 출발지 등록 | 각 참여자가 출발 위치를 등록하고 수정할 수 있습니다. |
| 중간 지점 추천 | 참여자 출발지를 기준으로 만나기 좋은 역과 중심 좌표를 추천합니다. |
| 주변 장소 탐색 | 추천 지점 근처의 카페, 음식점, 회의 공간 등을 탐색합니다. |
| 개인별 경로 확인 | 대중교통 또는 자동차 기준으로 참여자별 이동 경로를 확인합니다. |

[//]: # (## Team Members)

[//]: # ()
[//]: # (### Backend)

[//]: # ()
[//]: # (| 백도현 | 장현호 |)

[//]: # (|:---:|:---:|)

[//]: # (| [@BaekDoHyeon]&#40;https://github.com/BaekDoHyeon&#41; | [@hyunolike]&#40;https://github.com/hyunolike&#41; |)

## Tech Stack

### Frontend

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=for-the-badge&logo=storybook&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white)

### Backend

![Java](https://img.shields.io/badge/Java_25-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Gradle](https://img.shields.io/badge/Gradle-02303A?style=for-the-badge&logo=gradle&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)

## Architecture

```text
moyeorak
├── frontend/            New main frontend workspace
├── backend/             New main backend workspace
└── reference/
    ├── frontend/        Previous team frontend Git submodule
    └── backend/         Previous team backend Git submodule
```

The previous team frontend is preserved under `reference/frontend/`. Its routes are organized by domain under `reference/frontend/src/domains`: `meeting`, `schedule`, and `location`. Shared UI, hooks, providers, and utilities live in `reference/frontend/src/shared`.

### Frontend Architecture

```mermaid
flowchart TD
    Browser[Browser] --> Routes["React Router<br/>reference/frontend/src/routes.tsx"]
    Routes --> Meeting[meeting domain]
    Routes --> Schedule[schedule domain]
    Routes --> Location[location domain]

    Meeting --> MeetingPages[pages]
    Meeting --> MeetingHooks[hooks]
    Meeting --> MeetingApis[apis]
    Meeting --> MeetingTypes[types]

    Schedule --> SchedulePages[pages]
    Schedule --> ScheduleViews[views]
    Schedule --> ScheduleComponents[components]
    Schedule --> ScheduleHooks[hooks]
    Schedule --> ScheduleApis[apis]

    Location --> LocationPages[pages]
    Location --> LocationComponents[components]
    Location --> LocationHooks[hooks]
    Location --> LocationApis[apis]

    Shared["shared<br/>components, hooks, providers, utils"] --> Meeting
    Shared --> Schedule
    Shared --> Location

    MeetingApis --> Axios[Axios client]
    ScheduleApis --> Axios
    LocationApis --> Axios
    Axios --> BackendAPI[Backend API]
```

The previous team backend is preserved under `reference/backend/`. Its domains are organized under `reference/backend/src/main/java/com/dnd/moyeolak/domain`: `meeting`, `participant`, `schedule`, and `location`. The backend uses MySQL for primary domain data and PostgreSQL/PostGIS for station spatial data. External integrations include Kakao, Google, and ODsay clients for place search, directions, nearby places, and transit routes.

### Backend Architecture

```mermaid
flowchart TD
    Client[Frontend Client] --> Controllers[Domain Controllers]

    Controllers --> MeetingService[meeting service]
    Controllers --> ParticipantService[participant service]
    Controllers --> ScheduleService[schedule service]
    Controllers --> LocationService[location service]

    MeetingService --> MeetingRepo[meeting repository]
    ParticipantService --> ParticipantRepo[participant repository]
    ScheduleService --> ScheduleRepo[schedule repository]
    LocationService --> LocationRepo[location repository]

    MeetingRepo --> MySQL[("MySQL<br/>Primary DB")]
    ParticipantRepo --> MySQL
    ScheduleRepo --> MySQL
    LocationRepo --> MySQL

    LocationService --> StationRepo[station repository]
    StationRepo --> PostGIS[("PostgreSQL / PostGIS<br/>Station data")]

    LocationService --> Kakao["Kakao API<br/>local search, directions"]
    LocationService --> Google["Google API<br/>places, distance matrix"]
    LocationService --> Odsay["ODsay API<br/>transit routes"]

    Global["global<br/>config, response, exception, filter"] --> Controllers
    Global --> MeetingService
    Global --> ParticipantService
    Global --> ScheduleService
    Global --> LocationService
```

## Getting Started

### Backend

```bash
cd reference/backend
cp .env.example .env
docker-compose up -d
./gradlew bootRun --args='--spring.profiles.active=local'
```

Run tests:

```bash
cd reference/backend
./gradlew test
```

### Frontend

```bash
cd reference/frontend
cp .env.example .env
pnpm install
pnpm dev
```

Build and check:

```bash
cd reference/frontend
pnpm check
pnpm build
```

## Links

- [New backend workspace](./backend/README.md)
- [New frontend workspace](./frontend/README.md)
- [Reference backend README](./reference/backend/README.md)
- [Reference frontend README](./reference/frontend/README.md)
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Storybook: `http://localhost:6006`
