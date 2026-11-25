# FMY262 (FM-1 OPL3 트래커)

M-VAVE FM-1(240×240 화면, 노브 4 + 인코더 3 + MASTER, 버튼 12, 27건반)용 커스텀 펌웨어로 만들 **OPL3(YMF262) 트래커**. 앱 이름은 **FMY262**(칩 이름에서), 지은이 표기 "by Mr. Tracy Evans", 버전 **V0.8.3**(아래 "버전").
지금은 브라우저 프로토타입이 완성된 상태이고, 다음 단계는 실기 이식이다. 대화는 한국어로 한다.

## 폴더

| 경로 | 내용 |
|---|---|
| `web/template.html` | UI 전체(조작 처리, 240×240 화면 그리기, 옆 설명 패널). `/*OPL*/ /*ENGINE*/ …` 자리에 아래 파일들이 끼워진다 |
| `web/engine.js` | 재생 엔진 `class Engine` (OPL3 레지스터 쓰기, 시퀀서, AT2 이펙트, 매크로). AudioWorklet 안에서 `Engine.toString()`으로 돌므로 **바깥 전역에 의존하면 안 된다** |
| `web/demo.js` | 데모 곡, 빈 패턴, 곡 정규화(`normSong`, 옛 형식 변환), `insBytes`, `orderPos` |
| `web/export.js` | A2M(AT2 v11) 내보내기/가져오기: aPLib(AT2 변형)·LZH(v12–14) 해제, CRC, FM1X 예비영역, zip |
| `web/presets.js` | 34개 팩토리 프리셋 |
| `web/font.js` | 5×7 비트맵 글꼴(6px 간격) |
| `web/opl3fn.js` | **DBOPL**(기기와 같은 SPEC+PRE, 44.1kHz, 채널별 파형 캡처 `opl_scope_on/opl_scope`) → wasm → wasm2js 결과(`makeOPL()`); `opl3/wrap_dbopl.c` + `opl3/build-dbopl-wasm.sh`(`npm run build:dbopl`)로 다시 만든다. 예전 Nuked판은 `web/nukedfn.js`(`opl3/build-wasm.sh`) |
| `web/rad.js` | RAD(Reality AdLib Tracker v1.0/v2.1) 가져오기 `importRAD`/`isRAD`: 틱 단위로 RAD 재생을 흉내 내(리프·악기 리프·전치·중첩 8단) 사건을 모은 뒤 패턴에 펼침(리프는 펼쳐 넣음, 자리마다 패턴 하나 → 같은 것은 합침). 트랙 A = TA[c](2OP·4OP 꼬리), 둘로 나뉜 알고리즘 4–6은 TB[c]에 두 번째 소리. RAD 음 표는 평균율보다 9.8센트 낮음(AT2와 같은 AdLib 표 → 엔진 A4 437.52Hz로 해결, ft에 따로 안 넣음), 행 중간 키오프 = 노트 컷(36 3x), 늦은 음 = 노트 딜레이(36 2x), 악기 없는 음 = 레가토(3 FF). 못 넣는 것은 `warn`(MIDI 악기, M/U, 한 행에 두 음, 넘친 이펙트). 워크벤치 곡 탭·프로토타입 USB 받기에서 .a2m과 함께 받음. 시험 곡은 `vendor/rad/`(git 밖, AdPlug 저장소의 5곡 + 참고용 rad2.cpp) |
| `web/songfile.js` | 곡 파일 "FMY1"의 JS판(`fmyWrite`/`fmyRead`, C `songfile.c`와 같은 바이트) |
| `web/workbench.html` | 워크벤치 사이트 첫 화면: 탭 실행(펌웨어를 브라우저에서 돌리는 에뮬레이터 `emu/`), 곡(에뮬레이터 또는 USB의 FM-1 슬롯 ↔ A2M·RAD/.fmy; 데모 곡 버튼은 0.8.1 배포 뒤 뺌), 펌웨어 설치(fm1-base 설치 페이지), 도움말. `npm run workbench` → `dist/workbench/`(firmware/tracker/tools/make_workbench.py), `npm run serve`로 127.0.0.1:8262. 문구는 영문 우선, 한/영 토글(`TEXT.en/ko`, localStorage `fmy262-wb-lang`). 설치 탭의 페이지는 make_workbench.py `installer()`가 fm1-base 원본을 고쳐 씀: 일본어 표 → `installer_ko.js`, 언어는 워크벤치만 바꿈(페이지 자체 토글은 숨김, `?lang=`·postMessage), 백업 문구는 "your FM-1", 색은 AdLib Tracker II의 파랑(워크벤치·실행 탭 에뮬레이터 `emu_page()`도 같은 파랑; 바뀐 원본이면 빌드가 멈춤). 스톡 펌웨어: `vendor/stock/FM-1.fwsc`(git 밖)가 fm1-base가 아는 체크섬(V15/V16)이면 `firmware/FM-1-stock.fwsc`로 실어 페이지가 스스로 읽고 버튼 하나로 설치, 없으면 예전처럼 내려받아 고르는 단계. 단독판 `dist/fmy262-workbench.html`도 만들어짐. 공개판(`FMY_PUBLIC=1`, `tools/release.sh`)에는 스톡 펌웨어를 넣지 않음(M-VAVE 것이라 재배포 불가), `FMY_REPO`면 설치 페이지에 저장소 링크 |
| `web/build.cjs` | 위 파일들을 합쳐 `dist/fm1-opl3-tracker.html`과 `dist/fmy262-workbench.html` 생성 |
| `opl3/` | Nuked OPL3 소스(LGPL-2.1), wasm 래퍼 `wrap.c`, 최소 libc 헤더 |
| `firmware/engine/` | 엔진의 C판 `eng.c`/`eng.h`, 곡 아레나 `songmem.c`(빈 칸 생략 패턴·FM 매크로, 편집 API)(engine.js를 함수 단위로 그대로 옮김; 레지스터 쓰기는 콜백, 패턴 칸은 `EngSong.cell` 접근자). `test/eng_host.c` = t42의 C쪽 실행기 |
| `firmware/player/` | 실기 재생 앱(엔진 + DBOPL SPEC, `songs.h` 내장곡). DBOPL 소스는 `firmware/opl3bench/emu/`를 씀 |
| `firmware/ui/` | 화면·조작의 C판 `ui.c`(template.html의 st·knob·press·draw*를 그대로, 240×240을 띠 단위로 그림), 편집 중인 곡 `uisong.c`(아레나 + 악기·이름), `tools/ui2c.cjs` → `ui_data.h`(글꼴·테마·이펙트 표·프리셋 등을 template/font/presets.js에서 뽑음), `test/ui_host.c` = t44의 C쪽. 곡 파일 `songfile.c`("FMY1" 형식), 곡 슬롯 `slots.c`(플래시), `test/sl_test.c` = t45 |
| `firmware/tracker/` | 실기 트래커 앱 **FMY262**(엔진 + DBOPL SPEC + `firmware/ui`, FM-1_78, 빌드 결과 `build/fmy262.fwsc`). 곡은 `firmware/player/songs.h` |
| `firmware/bench/opl3_bench.c` | 실기 CPU 부하 측정용(18채널 전부 울림) |
| `tests/` | node 테스트(엔진·A2M 왕복·퍼커션·4OP·매크로)와 puppeteer 화면 테스트. t42 = C 엔진 대 JS 엔진(레지스터 쓰기 로그 비교, `cc` 필요), t43 = 곡 아레나 무작위 편집, t44 = C 화면 대 웹 화면(같은 입력 스크립트, RGB565 픽셀 비교, 크롬 필요), t45 = 곡 파일 왕복·슬롯 조작·저장 중 전원 끊김·USB 조각 쓰기, t46 = 호스트 시뮬레이터에서 USB 슬롯 전송(`firmware/tracker/tests/usb_test.py`, vendor 필요), t48 = RAD 가져오기 대 AdPlug(`tests/rad/rad_dump.cpp` + `vendor/rad/rad2.cpp` — brew의 AdPlug 2.4는 중첩 리프를 테스트 곡 설명과 다르게 처리하므로 새 소스를 씀; 채널·틱마다 키와 음높이 비교, 경고 없이 다 들어간 곡은 완전히 같아야 함, libadplug 없으면 건너뜀), t47 = 웹 DBOPL(wasm2js) 대 C DBOPL 샘플 비교(파형 캡처를 켜도 믹스가 같은지 포함, `firmware/opl3bench/emu/test/db_host.c`). t42에는 JS로 쓴 FMY1을 C `sf_read`로 읽어 재생하는 비교도 있음 |

빌드: `npm run build` → `dist/fm1-opl3-tracker.html` (브라우저로 열면 바로 동작).
테스트: `npm test`. 화면 테스트(t21, t31, t38 등)는 `npm i` 후 크롬 경로(`/usr/bin/google-chrome`)를 맞춰서.
실제 AT2 곡 일괄 테스트: `AT2_MODULES=<a2m 폴더> node tests/t39.cjs` (AT2 배포본 `package/modules` 244곡 전부 오류 없이 재생됨).

## 배포 (GitHub, 0.8.1부터)

- 저장소 **github.com/jpark-spec/fmy262**(공개, 2026-11-25부터 Pages = **jpark-spec.github.io/fmy262**, 탭 주소 `#run`·`#songs`·`#install`·`#help`; pages.yml은 비공개면 건너뜀, 다시 게시는 `gh workflow run pages.yml -f tag=vX.Y.Z`). 커밋 이름 "Mr. Tracy Evans", 이메일은 GitHub noreply(이 폴더의 git 설정). 릴리스는 `FMY_REPO=https://github.com/jpark-spec/fmy262 tools/release.sh X.Y.Z` 뒤 `gh release create vX.Y.Z release/fmy262-X.Y.Z/fmy262-X.Y.Z.fwsc release/fmy262-X.Y.Z.zip release/fmy262-workbench-site-X.Y.Z.zip release/SHA256SUMS-X.Y.Z.txt …`(.fwsc를 따로 붙여야 The Firmware Hub가 가져감). 릴리스가 띄운 Pages 실행은 환경 보호로 실패하므로 `gh workflow run pages.yml -f tag=vX.Y.Z`
- 저장소에는 소스만: `vendor/`·`dist/`·`release/`·빌드 결과·`tests/out`은 `.gitignore`. fm1-base(+ felucca-bsp 서브모듈)는 `tools/fetch-vendor.sh`가 고정 커밋으로 받음(커밋을 바꾸면 그 스크립트도)
- 릴리스: 버전 올리기(아래 "버전" 셋 + `CHANGELOG.md`의 `## X.Y.Z` + `package.json`) → `tools/release.sh X.Y.Z` → `release/`의 `fmy262-X.Y.Z.zip`, `fmy262-workbench-site-X.Y.Z.zip`, `SHA256SUMS-X.Y.Z.txt`를 GitHub 릴리스 `vX.Y.Z`에 올림 → `.github/workflows/pages.yml`이 사이트 zip을 Pages에 게시(설정: Pages 소스 = GitHub Actions)
- `.github/workflows/ci.yml`: 푸시마다 웹 빌드 + `npm test`(우분투; 펌웨어 빌드는 툴체인 때문에 안 함, t46·t48은 스스로 건너뜀)
- **The Firmware Hub**(thefirmwarehub.com, 0.8.3부터 준비): 저장소 루트 `fmhub.json`(카드 문구·`docs/card.png` = 호스트 시뮬레이터의 9채널 재생 화면 240×240·색 #55FFFF·sounds "none – all synthesised": 프리셋 34개가 libADLMIDI 706개·AT2 instr 486개 뱅크와 하나도 안 겹침을 확인), 정체 FM-1_7800(허브에서 비어 있음 확인), USB 포트 이름 "FMY262 FM-1". 허브는 3시간마다 최신 릴리스의 .fwsc와 fmhub.json을 읽음. 등록 조건 중 실기 시험(V15에서 설치, 다른 펌웨어에서 설치, 다른 펌웨어로 떠나기, 쓰는 중 끊기)은 사람이 할 것
- 문서: `README.md`(영문)·`README.ko.md`, `LICENSE`(GPL-2.0 전문), `NOTICE.md`(다른 사람 코드·따른 파일 형식). 오픈소스를 더 쓰면 NOTICE와 template.html `LICS` 둘 다에

## 버전

화면 표시는 template.html `ABOUT`·SYSTEM INFO 줄, ui.c INFO 줄(셋을 같이 바꿀 것). 메이저(0.N) = 테스트나 실측으로 닫은 큰 단계, 마이너(0.N.x) = 그 사이 작업. 2026-11-24 이전 웹 프로토타입 기록은 없어 0.1로 묶음.

| 버전 | 내용 |
|---|---|
| 0.1 | 웹 프로토타입(Nuked, AT2 이펙트, A2M, 4OP·퍼커션·매크로; t20–t41) |
| 0.2 | 실기 성능 측정, DBOPL 채택(opl3bench) |
| 0.3 | 엔진 C 이식, 실기 재생(t42) |
| 0.4 | 곡 아레나(t43) |
| 0.5 | 화면 C 이식, 트래커 앱(t44). .1 HOME+PRESETS 한 채널, .2 이름·시작 화면·INFO·노브 배치, .3 저장 슬롯(t45), .4 새 곡 |
| 0.6 | USB 슬롯 전송, A2M 워크벤치(t46). .1 웹도 DBOPL, 워크벤치 에뮬레이터·곡·설치 탭(t47) |
| 0.7 | 파형 화면. .1 워크벤치 한/영·설치 페이지 한국어·블루·3CH TRACK, .2 스톡 펌웨어 내장·전체 블루, .3 RUN 타이틀 삭제·에뮬레이터 버튼 블루·노브 원 삭제, .4 설정 메뉴 기기 구현·CPU LOAD, .5 건반(커서 음 입력, LED)·INFO에서 Nuked 삭제 |
| 0.8 | 두 코어(DBOPL 뱅크 1을 2번 코어에서, t47 두 코어 대 한 코어). .1 RAD 가져오기(t48 AdPlug 비교), 첫 공개 배포. .2 AT2 재생 맞춤(A2M 키오프 0xFF, 볼륨 스케일링 끔 vdir, A4 437.52Hz, 비브라토 표 규칙, 키오프 뒤 톤 포르타). .3 비브라토 위치 유지, FM 매크로 레벨 = 63−TL, 악기 번호만 있으면 볼륨 초기화 |

## 데이터 모델 (song)

- `rows`(16–256), `order[]`(0–7F 패턴, 80h+n = n번 위치로 점프), `patterns[]`(최대 128, 각 행 20트랙)
- 셀 `[note, ins, fx1, fx1val, fx2, fx2val]` — note: MIDI 번호, -1 빈칸, -2 키오프. fx = AT2 ef_ 번호(0–47), -1 없음. **볼륨 칸 없음**(AT2와 같이 Cxx)
- `inst[]`(최대 255): `op[2]`(am vib egt ksr mult ksl tl ar dr sl rr ws), fb, con, pan(0 L/1 C/2 R), ft(센트), arpT, vibT, `four`(4OP 첫 악기), `fmm`(FM 레지스터 매크로), `pv`
- `arp[16] / vib[16]` 매크로 표(16칸), `bpm, speed, lfo(bit1 AM깊이, bit0 VIB깊이), opl(2|3), perc, four(4OP 쌍 비트 6개), gvol, vtab, mspd, vdir`
- `vdir` = 1이면 AT2 "볼륨 스케일링 꺼짐": 볼륨이 곧 오퍼레이터 레벨(63−TL), 음 시작 볼륨 = 악기 TL(4OP는 AT2처럼 늘 스케일). 0(기본) = 볼륨이 악기 TL을 비율로 줄임. A2M 플래그 bit 7(FM1X +916에 0xB0|vdir 표시(0.8.2는 0xA0), 표시 없는 옛 FMY262 A2M은 0), FMY1은 vdir일 때만 판 2(머리 끝 1바이트). 화면에서 바꾸는 곳은 아직 없음
- 음높이 기준 A4 = 437.52Hz(AT2·RAD의 AdLib 음 표 평균, 440보다 9.81센트 낮음; engine.js·eng.c)
- 트랙 → OPL 채널 배치는 AT2 표(`_chmm_*`, `_chpm_*`)를 그대로 쓴다(engine.js `MM`/`PM`). 4OP 쌍: 트랙 1+2, 3+4, 5+6, 10+11, 12+13, 14+15. 퍼커션: 트랙 16–20 = BD SD TT CY HH
- 4OP 악기: N(=four)이 OP3/OP4(쌍의 첫 트랙), N+1이 OP1/OP2. 연결 이름은 AT2 매뉴얼 기준(conn = (N.con<<1)|(N+1).con; 0 FM/FM, 2 FM/AM, 1 AM/FM, 3 AM/AM)

## 조작 (요약 — 자세한 건 dist 화면 옆 설명 패널과 template.html `HINTS`)

- 패턴: SELECT 위아래, 노브1 패턴, 노브2 채널, ALGORITHM 좌우 이동(HOME=채널 단위), 노브3 FX 명령어(HOME=묶음 단위), 노브4 커서 FX 칸 값(HOME=16씩) (2026-11-25에 바꿈: 예전엔 노브3 값·노브4 이동·ALGORITHM 명령어), FX 짧게 칸 이동/길게 이펙트 목록, PRESETS 악기, EDIT 지우기, HOME 짧게 3채널→9채널→파형 1채널→파형 9채널, HOME 길게 설정 메뉴
- PLAY는 어느 화면(설정 메뉴·INFO·이름 입력·확인창 포함)에서든 재생/정지(HOME+PLAY = 패턴 반복)
- 블록: HOME+노브1/2로 범위, 노브3 이조(HOME=옥타브), PRESETS 악기, EDIT 지우기, HOME+OCT−/+ 복사/붙여넣기
- ENV 악기 4쪽(VOICE·ADSR·OUTPUT·SCALE), ALGORITHM = FM/ADD/4OP×4, SEL = OP 전환
- ARP = 아르페지오 → 비브라토 → FM 레지스터 매크로
- GLO = GLOBAL(TEMPO·CHIP·VOICES), HOME+GLO = 파일(슬롯 4개, A2M), SAVE = 저장 흐름, SEQ = 곡 순서

## 실기 이식 계획 (다음 할 일)

하드웨어: JieLi AC791N/WL82, pi32v2 듀얼 코어(FPU), 기본 360MHz(정격 320MHz). M-VAVE가 FM-1 Workbench(AC79 SDK 포함)를 공개함.

1. **성능 측정**: 서버(x86 2.1GHz)에서는 18채널이 코어 하나의 약 2.6%(약 1,100–1,500 사이클/샘플). pi32v2에서 50%를 넘으면 더 가벼운 OPL 코어로 교체 검토
   - **실측 (2026-11-25)**: 기반을 Windows SDK 대신 **fm1-base**(felucca-bsp 위, MPL-2.0, 맥에서 Docker로 빌드)로 정함. `firmware/opl3bench/`(fm1-base 앱)를 FM-1에 구워 실제 오디오 인터럽트(44.1kHz, 256프레임)에서 Nuked OPL3 18채널을 돌린 결과 **RENDER LOAD 257.5%**(360MHz 확인, 크래시 없음). 맥 시뮬레이터에서는 2.2%. Nuked는 키를 끈 채널도 계산하므로 채널 수와 거의 무관. 화면의 XRUNS 0은 믿지 말 것: 렌더링이 블록 2개 넘게 걸리면 fm1-base의 xrun 검사(버퍼 반쪽 비교)가 놓친다
   - 빌드: `vendor/fm1-base`에서 `.venv/bin/python tools/build.py ../../firmware/opl3bench`(`--host`는 맥 시뮬레이터). 도커가 안 잡히면 `PATH=$HOME/.docker/bin:$PATH`(Docker.app을 먼저 켤 것). 설치: `tools/fm1_install.py …/opl3bench.fwsc`. `vendor/`는 git에 넣지 않음(felucca-bsp, fm1-base를 clone)
   - 카운터 측정(`tools/fm1_remote.py log`의 `opl …` 줄): 블록 15.17ms / 예산 5.80ms(261%), **21,300 사이클/출력 샘플**(Nuked 내부 49,716Hz 기준 약 18,900, x86의 10배 이상). 지연은 명령어 읽기 11.6%, 데이터 읽기 12.5%, 쓰기 1.2%뿐 → 나머지 ~75%가 순수 연산. RAM으로 옮겨 지연을 다 없애도 ~195%, 2번째 코어까지 써도 ~100%
   - 결론: Nuked는 FM-1에서 불가. **더 가벼운 OPL 코어로 교체**가 필요(목표 4,000 사이클/샘플 이하로 50% 미만). 후보는 같은 벤치(`firmware/opl3bench`)에 넣어 실기에서 비교
   - **후보 비교 (2026-11-25)**: 맥 비교(`firmware/bench/opl_compare.sh`, 18채널 기준 Nuked 대비): Nuked fast 1.75×, DBOPL C 3.2×, ymfm 1.7×, Opal 1.7×(퍼커션 없음), VPC 13×(4OP·퍼커션 없음 → 제외). 실기(벤치 PRESET 0/1/2, 18채널): Nuked 261%(21,258 사이클/샘플), Nuked fast 167–246%(들쭉날쭉, 13,653–20,089), **DBOPL 58%(4,726, 16채널 52%), 10초간 xrun 0**. DBOPL 지연은 IF 14%+RD 15%
   - Nuked fast에서 xrun이 급히 늘어 보이는 건 측정 탓: 렌더링이 블록 1–2개분이면 매번 잡히고, 2개 넘게 걸리는 Nuked는 놓친다. 둘 다 과부하
   - **DBOPL 채택 방향**: `firmware/opl3bench/emu/dbopl/dbopl.c` = Chocolate Doom 2.0.0의 C 변환판(GPL-2.0+)에 수정 — `DBOPL_PRE`(double 표를 `tools/dbopl_gen.c`가 만든 `emu/dbopl/dbopl_pre.h`로, 44.1kHz 고정), 퍼커션 모드에서 `abort()`하던 변환 버그 수정, `DBOPL_SPEC`(합성 모드별 펼침, DOSBox C++ 템플릿과 같음), `DBOPL_RAM`(렌더링을 `.app_ram`에). 모든 조합의 출력 해시가 원본과 같음. 변형은 `emu/db_xip.c`·`db_spec.c`·`db_ram.c`(공통 `db_variant.inc`, 접두어 dbx_/dbs_/dbr_)로 벤치 PRESET 2/3/4. 채택하면 펌웨어 전체 GPL. 엔진 이식 시 웹 프로토타입(Nuked)과 소리 차이를 t39 곡들로 비교할 것
   - **RAM 배치 실험 (2026-11-25, 실기 18채널)**: DBOPL 원본 60%(4,869 사이클/샘플, 지연 IF 14%·RD 15%) → **SPEC 42%(3,440)** → SPEC+RAM 42%(3,405, IF 10%·RD 17%). 효과는 거의 다 SPEC에서 나오고 RAM 배치는 1%뿐. 남은 RD 지연(17%)의 출처는 아직 모름(WaveTable·MulTable은 초기화 때 RAM으로 복사되니, 플래시에 남은 다른 const 표인지 RAM 접근 자체인지 확인 필요) → 다음 후보는 남은 const 표를 RAM으로. RAM 판은 함수 포인터 호출 때문에 `fm1.toml ram_code_allow`에 `dbr_` 핸들러들을 등록(대상이 모두 RAM인 것은 `build/opl3bench.dis`에서 확인). 엔진에는 **SPEC을 쓰는 것**으로 충분(RAMTEXT 아낌)
2. **엔진 C 이식**: `engine.js`를 C로 옮김. (처음엔 코어 1에 오디오, 코어 0에 UI로 나누려 했으나 fm1-base의 두 번째 코어는 렌더 일꾼뿐 → 4번 "두 코어" 참고) (DBOPL은 44.1kHz로 바로 내므로 리샘플 불필요)
   - **진행 (2026-11-25)**: `firmware/engine/eng.c` 완성. `tests/t42.cjs`가 같은 곡·메시지(재생, 정지, 미리듣기 on/off, 뮤트, 튠)를 JS와 C에 넣고 레지스터 쓰기 로그(샘플 위치·레지스터·값, 행 위치)를 비교: 데모곡 + 무작위 곡(모든 이펙트·4OP·퍼커션·FM 매크로·OPL2·주문 점프) 300곡 + AT2 곡에서 **ENG_EXACT(double) 판 전부 일치**(615만 줄), 기기용 float 판(fastmath.h)은 301곡 중 9곡에서 423줄이 F-number ±1–5. 큰 차이는 AT2 슬라이드 규칙의 블록 경계(F-number 0x2AE/0x156에서 블록을 넘기며 0.3% 튐)에 정확히 걸린 슬라이드가 float/double 반올림으로 다른 쪽을 고른 경우라, 누적 오차가 아니고 float로는 없앨 수 없음(최대 약 10센트, 극단적 무작위 이펙트에서만). 일부러 넣은 버그를 잡는 것 확인. (무작위 곡 생성기의 난수가 double 정밀도를 넘어 같은 곡을 반복하던 것을 `Math.imul`로 고침)
   - 틱 시계를 JS·C 모두 32.32 고정소수점으로 바꿈(engine.js `calcSpt`): 예전 double 누적은 정확히 블록 경계에 떨어지는 틱을 반올림에 따라 한 블록(32샘플) 늦게/일찍 냈음. 차이는 그 경우의 0.7ms뿐
   - **실기 재생 (2026-11-25)**: `firmware/player/`(fm1-base 앱 OPL3 PLAYER, GPL-2.0+) = 엔진 + DBOPL SPEC을 오디오 인터럽트에서. 곡은 `tools/song2c.cjs`가 만든 `songs.h`(빈 칸 생략, 행별 색인: 데모 229칸). UI→렌더 메시지는 32칸 링. PLAY 재생/정지, PRESET 곡, 건반 = 9번 트랙 미리듣기(K1 악기, OCT±). 데모곡 재생 중 **렌더링 부하 15–22%, 최고 27%(1,200–1,760 사이클/샘플), xrun 0**, 정지 중 2%(DBOPL은 꺼진 채널을 건너뜀). 빌드·설치는 opl3bench와 같은 방법(`tools/build.py ../../firmware/player`)
   - 스피커·이어폰 모두 정상(2026-11-25; 이어폰 무음은 꽂은 단자를 잘못 고른 것이었음). 출력 전환은 하드웨어에서 일어나고 펌웨어가 할 일은 없음. 앱은 `headphones = true`로 꽂힘(PB5)을 화면 "MASTER / JACK" 줄과 로그 `ply master … jack …`에 보여줌
   - 원격 `fm1_remote.py master N`은 노브를 덮어쓴 채 남음 → 측정 후 반드시 `master pot`
   - 고친 것: PRESET 인코더 떨림이 곡 다시 읽기(→ 재생 멈춤)를 보내던 것(곡 번호가 실제로 바뀔 때만), 곡 읽기를 오디오 인터럽트에서 하던 것(엔진을 곡에서 뗀 뒤 메인 루프에서 읽고 다시 붙임; 시작 때는 오디오 전에), songmem이 편집마다 매크로 포인터 255개를 고치던 것(옮겨진 것만)
   - 남은 것: 곡 저장 형식(3번)과 편집에 맞춘 `EngSong.cell`, 화면(4번), 2번째 코어 배치 여부(지금은 코어 하나로 충분해 보임), Nuked 프로토타입과의 소리 비교
3. **메모리**: 패턴을 꽉 찬 배열(최대 3.9MB)로 두지 말고 빈 칸을 생략한 압축형으로. A2M(본체 1.1MB)은 기기 RAM에서 통째로 풀지 말고 USB로 주고받을 때 스트리밍 변환. AC791N의 RAM 용량은 SDK로 먼저 확인
   - **확인한 것 (2026-11-25)**: 외장 RAM 없음. `.data/.bss` 96KB + 풀 336KB(`ram_layout = "packed"`면 합쳐 464KB), 플래시 1MiB(앱 영역 581KB, 나머지 저장 영역), SD는 카드 개조 필요(m-card). 가진 AT2 곡의 칸 채움 16–28%
   - **구현**: `firmware/engine/songmem.c/.h` = 곡 아레나. 패턴 128개 + 악기별 FM 매크로 스텝 255개를 한 바이트 영역에 번호 순으로, 빈틈(gap) 하나를 두고 보관. 편집은 그 객체 옆으로 빈틈을 옮긴 뒤 늘이고 줄임(같은 패턴을 연달아 고치면 거의 공짜). 패턴 = 행 색인 `uint16 rs[rows+1]` + 빈 칸을 뺀 칸들(머리 바이트: 트랙 5비트, 음+악기/FX1/FX2 있음 3비트, 그 뒤 있는 것만 2바이트씩) → 음+악기 3바이트, 다 찬 칸 7바이트, 실제 곡 약 4바이트/칸(opl3.a2m 2,162칸 = 8.6KB, 꽉 찬 배열 46KB). API: `sm_get/sm_row/sm_set/sm_set_row/sm_new/sm_del/sm_rows/sm_fmm`, 엔진은 `sm_cell`로 읽음. 공간 부족이면 -1, 아무것도 안 바뀜. 잠금은 호출자 몫(기기에서는 편집을 `plat_lock` 안에서; memmove는 최대 아레나 크기). 기기 libc에 memmove가 없어 자체 복사(정렬되면 워드 단위)
   - **검증**: t42에 아레나 모드(`eng_host -a`) 추가 → 데모·무작위 300곡·AT2 곡 모두 JS와 레지스터 쓰기 동일. t43 = 무작위 편집 80만 번을 꽉 찬 배열 모델과 대조(ASan·UBSan, 4/16/64KB 아레나로 꽉 차는 경우 포함)
   - **재생 앱에 적용**: `firmware/player`가 곡을 아레나(192KB, 풀)로 읽어 재생. 풀 사용 299KB / 336KB → 화면 작업용으로 약 45KB 남음(부족하면 아레나를 줄이거나 `ram_layout = "packed"`). 실기 재생은 아직 이 판으로 다시 굽지 않음
   - 남은 것: 플래시 저장 형식(곡 슬롯), A2M ↔ 기기 스트리밍 변환(5번 USB와 함께)
4. **화면**: 240×240 SPI LCD에 `font.js` 글꼴과 `template.html`의 draw* 함수 구성을 그대로 옮김
   - **진행 (2026-11-25)**: `firmware/ui/ui.c`로 웹 UI를 함수 단위로 옮김(double·libm 없이 정수 반올림을 JS `Math.round`와 같게, 파형은 float 사인). t44가 15개 입력 스크립트(패턴·블록·악기 4쪽·4OP·매크로·SEQ·GLOBAL·확인창·설정·FX 목록·프리셋·이름·녹음·퍼커션)의 74장을 웹과 비교해 **전부 픽셀 동일**. 웹 쪽은 `#uitest`로 열면 `window.__ui` 시험 고리가 생김
   - 실기 앱 `firmware/tracker/`: 입력·편집·엔진 호출을 메인 루프에서 `plat_lock` 안에서(오디오 인터럽트가 편집 도중을 보지 않게), 엔진의 행 콜백은 렌더에서 위치만 남기고 메인 루프가 `ui_pos`로 넘김. 화면은 40줄 띠 2개를 번갈아 그리며 DMA로(약 30fps). 맥 시뮬레이터에서 재생·화면 확인, 기기 빌드 풀 275KB/344KB·.data+.bss 49KB/96KB
   - **실기 (2026-11-25)**: 구워서 크래시 없음. 데모곡 재생 중 렌더링 부하 16%(1,318 사이클/샘플, 최고 27%), 정지 중 2%, xrun 0. 화면 한 장 그리기(띠 6개 + SPI 전송) 22–24ms, 최고 32ms → 33ms 간격이라 메인 루프의 약 70%가 그리기. 원격 입력(노브·SELECT·ENV·PLAY)으로 재생 중 편집·화면 전환 정상. 로그는 `fm1_remote.py log`의 `trk …` 줄(draw = 그리기 µs). 그리기를 줄이려면 바뀐 띠만 보내기
   - 시작 화면(DOS식 파란 바탕·이중 테두리, 3초 또는 아무 입력에 닫힘; 그 입력은 다른 일을 하지 않음, PLAY만 예외)과 HOME 길게 → SYSTEM → INFO(SEL/OCT+로 열기): 소개 + 라이선스·오픈소스(한 줄씩 스크롤: OCT+/SEL/노브 아래, OCT− 위, 오른쪽 스크롤바; A2M·RAD 형식 크레딧 포함). 문구는 template.html `ABOUT`·`LICS`(ui2c가 C로). 오픈소스를 더 쓰면 `LICS`에 추가할 것
   - **저장 (2026-11-25)**: 곡 파일 "FMY1"(`songfile.h`에 형식; 빈 칸 생략, 리틀엔디언, 읽기 전에 전체를 검사해 깨진 파일은 곡을 건드리지 않음). 슬롯 4개를 플래시 영역 5개(각 16섹터, 섹터당 3,840바이트만 씀 — XDATA 창의 0xF00..는 지움 상태로 둬야 함; 곡 최대 61,376바이트)에 돌려 쓰며, 64바이트 머리("FMS1", 슬롯, seq, 크기, CRC32)를 마지막에 쓰고 그다음에 옛 사본의 매직을 0으로 → 저장 중 전원이 끊겨도 옛 곡 아니면 새 곡이 남음. 영역 = 0x97000/0xA7000/0xB7000/0xC7000/0xE5000(app.c `REGIONS`). 설정(`ui_prefs`, key=value + 마지막 슬롯)·사용자 프리셋(`ui_presets`)은 `plat_store` 객체 `OBJ_PREFS`/`OBJ_PRESETS`(바뀔 때만 씀). 파일 화면: SEL 불러오기, EDIT 이름 바꾸기, OCT− 지우기(두 번), FX/ENV는 USB 자리("NOT YET"). 불러오기·저장 동안 잠금을 풀어 오디오는 계속 돎. 웹과 다른 점: 기기는 켤 때 마지막 슬롯을 읽음(웹은 자동 저장한 작업본), 슬롯 화면에 날짜 없음·크기는 FMY1 바이트. 실기: 굽고 크래시 없음, 시작 때 슬롯 읽기 0ms(빈 저장소). 맥 시뮬레이터 `tests/save.txt`로 저장→변경→전원→복원 확인
   - **새 곡 (2026-11-25)**: 파일 화면에서 OCT+ 두 번 → `newSong()`(web/demo.js: 64행, 빈 패턴 1개, 기본 악기·표; 옆 패널 New도 같은 것). C는 ui2c가 만든 `NEW_FMY`(그 FMY1 바이트)를 `sf_read`로 → 웹과 같은 곡. 호스트의 `slot_load(-1)`이 `ui_new_song`을 부름. 새 곡은 어느 슬롯에도 묶이지 않음(st.slot = -1)
   - **파형 화면 (2026-11-25)**: 패턴 화면에서 HOME 짧게 = 3채널 → 9채널(노트) → 파형 1채널 → 파형 9채널(3×3, 지금 채널이 든 9트랙 묶음) → 3채널. 노브2 채널, SEL 묶음, PRESETS 악기, 건반 연주만 되고 편집 조작은 막힘(FX는 파형을 닫고 FX 칸으로). 각 트랙의 OPL 채널(`eng_track_chan`/JS `trackChan`) 출력을 DBOPL이 따로 22.05kHz로 512샘플 링에 담음(`DBOPL_SCOPE`, 보일 때만 켬, 꺼지면 비용 0; 켜도 믹스는 비트 단위로 같음 = t47). 화면은 최근 448샘플에서 상승 영점을 찾아 그림, 세로는 채널 최대값(최소 2048)에 맞춤. 기기: `UiHost.scope_on/scope`(app.c → `dbs_scope_on/dbs_scope_read`, 캡처 버퍼 18KB는 풀), 웹: 워크렛에 `scopeon`/`scope` 메시지. t44 `scope` 스크립트는 양쪽에 같은 가짜 파형(`fakeScope` = ui_host `h_scope`)을 넣어 픽셀 비교. **실기 부하 (2026-11-25, 슬롯 1의 곡 재생)**: 파형 꺼짐 41–47%(3,430–3,810 사이클/샘플), 파형 1채널 52–55%, 9채널 50–55%(최고 59.8%), xrun 0 → 켜면 약 +7%p(약 +600 사이클/샘플, 핸들러마다 따로 렌더해 더하는 비용), 끄면 원래대로. 그리기 시간은 파형 화면이나 패턴 화면이나 약 29–30ms로 같음
   - **설정 메뉴 점검 (2026-11-25)**: 기기에서 아무 일도 안 하던 LEDS·KNOB ACCEL·SPEAKER EQ·CLICK·CLICK LEVEL·COUNT-IN·MIDI IN·MIDI TO REC를 웹과 같게 구현(나머지는 원래 됨). ui.c: 노브 가속(같은 노브 45ms 안이면 ×4, MASTER 제외), 카운트인(REC 켜고 PLAY → 박 수만큼 blip·"COUNT n" 뒤 0행부터; 메인 루프에서 세므로 약 30ms 흔들림), `ui_midi`(채널 거름, MIDIREC OFF면 녹음 잠시 끔), `ui_led_mode`. app.c: EQ(웹 Web Audio와 같은 바이쿼드 계수, 렌더 뒤), CLICK(행%4, 16행마다 강세, 사인 blip을 렌더에서 섞음 → MASTER를 따름), LED 모드 → `plat_lights`(INV는 꺼진 버튼을 켬), `plat_midi_in` → `ui_midi`. UiHost에 `eq/click/blip/cpu` 추가
   - **SYS · CPU LOAD**: 오디오 렌더가 쓴 시간의 몫. 기기 = `plat_cpu_pct()` + 최근 1초 가장 긴 블록(PK), 웹 = 워크렛 렌더 시간을 0.5초마다(PK는 최근 4개). 메뉴가 열려 있을 때만 읽음. t44(`#uitest`)에서는 웹도 값 없음("—")
   - **건반 (2026-11-25)**: 패턴 화면에서 건반 = 커서 칸(음·악기 칸)의 음을 바꿈, 커서는 그대로. REC가 켜져 있으면 넣고 STEP만큼 내려감(HOME+건반 키오프도 같음). 건반 LED(`ui_keys` → `plat_lights`의 keys): 누른 건반(MIDI 노트도 건반 범위 안이면) + 재생 중 커서 트랙에서 울리는 음(재생 행 위로 그 패턴에서 마지막 음; 키오프면 없음). 웹은 `.k.play`(파랑). INFO 라이선스에서 Nuked 삭제
   - **두 코어 (2026-11-25)**: `fm1.toml cpu2 = true`, `cpu2_fallback = true`(실패하면 재시작 없이 꺼질 때까지 한 코어). 두 번째 코어는 fm1-base 구조상 오디오 렌더의 일꾼일 뿐(화면·메인 루프는 못 옮김). `dbopl.c` `Chip__GenerateBlock3`이 `Chip__GenRange`로 나뉘어, 두 번째 코어가 OPL 뱅크 1(DBOPL 채널 9–17)을 자기 LFO 사본(`JobLfo`)과 자기 버퍼에, 이 코어가 뱅크 0(4OP 쌍·퍼커션·노이즈는 뱅크 안)을 하고 정수로 더함 → 한 코어와 샘플 단위로 같음. 파형 캡처도 같음(링 위치는 블록 끝에 한 번). `dbs_split(plat_cpu2_run, plat_cpu2_wait)`를 app_init에서(오디오 전에만 켤 수 있음). 버퍼·사본은 풀. t47이 `db_host -2`(일을 늦게 돌림)로 두 코어 대 한 코어를 믹스·파형까지 바이트 비교(LFO 사본을 빼먹는 버그를 잡는 것 확인). SYS · CORE(CPU LOAD 다음) DUAL/SINGLE = 다음 시작부터 두 코어/한 코어, 웹은 아무 일 안 함. CPU LOAD 값 끝에 코어 수(`2C`), 로그 `trk cpu% … cores 2 off 0 bad 0`(off = `plat_cpu2_gave_up`). 실기: 굽고 2코어로 켜짐, 크래시·xrun 0(정지 중만 봄; 재생 중 부하는 아직 안 잼)
   - 빠진 것: 되돌리기(undo)
5. **USB**: 업데이트 페이지(브라우저) ↔ 기기 파일 전송. Felucca의 편집기 통신 규칙(EDITOR_PROTOCOL.md)이 참고가 됨
   - **구현 (2026-11-25)**: fm1-base companion 서비스(`fm1.toml companion = true`, docs/COMPANION.md)의 파일(0x61)로 슬롯 4개를 `slot1.fmy`..`slot4.fmy`(APP_FILES)로 내놓음. 쓰기는 `sl_wbegin/sl_wdata/sl_wcommit`이 빈 영역에 바로 흘려 쓰고, CRC와 곡 검사(`sf_peek`)를 통과해야 머리를 씀(전원 끊김·잘못된 파일이면 옛 곡 유지). 재생 중엔 쓰기·지우기 거부(`app_file_busy`). 받으면 화면에 "SLOT n RECEIVED (USB)"; 지금 편집 중인 곡은 안 바뀜. A2M 변환은 기기가 아니라 브라우저(`dist/fmy262-workbench.html`: export.js + songfile.js)에서. 실기에서 슬롯 읽기·쓰기·지우기 확인(바이트 동일). 명령줄: `vendor/fm1-base/tools/fm1_companion.py ls|get|put|rm`
   - 파일 화면의 FX/ENV(웹은 A2M 내려받기/USB 대기)는 기기에선 "USB: USE THE WORKBENCH PAGE"만 띄움
   - **웹 = 기기와 같은 엔진 (2026-11-25)**: 웹 프로토타입의 소리 코어를 Nuked에서 DBOPL로 바꿈(44.1kHz로 열고, 안 되면 선형 보간). 워크벤치 사이트(`dist/workbench/`)의 "실행" 탭은 펌웨어 자체를 emscripten으로 빌드한 에뮬레이터(`build.py --web` → `firmware/tracker/build/emu`), "곡" 탭은 같은 companion 규칙으로 에뮬레이터(BroadcastChannel)나 USB 기기의 슬롯에 곡을 넣고 뺌, "펌웨어 설치" 탭은 fm1-base 설치 페이지에 `firmware/fmy262-dev.fwsc`를 실음(기기로 실제 설치는 아직 이 페이지로 안 해 봄). 에뮬레이터 슬롯은 새로고침하면 사라질 수 있음

## AT2와 맞춘 것 (2026-11-25, Corridor.A2M를 AdPlug a2m-v2와 틱 단위 비교)

- A2M 키오프 바이트는 **0xFF**(0x80은 FMY262 옛 출력만, FM1X 있을 때). 음 1–97, 고정음 0x91–0xF1
- 키오프 뒤 톤 포르타멘토 음 = 옛 음으로 다시 울리고 거기서 미끄러짐(`had`)
- 비브라토 표: 값은 마지막 음/음높이 변화(`vbase`) 기준, 이펙트가 음높이를 바꾸면(`fch`: 비브라토·슬라이드·포르타·아르페지오·아르페지오 표 칸) 표가 처음부터, 칸이 적용되면 그 값이 채널 음높이가 됨(이펙트 비브라토와 겹치면 AT2처럼 떠돎). 16칸 넘는 AT2 표는 k칸마다 하나·속도 ×k로 줄여 가져옴(경고)
- 비브라토·트레몰로 위치는 새 음에서 안 돌아가고, 그 이펙트가 없는 행에서만 0(AT2 vibr_table FillChar). FM 매크로 레벨 칸은 AT2 저장형(63−TL)으로 읽고 씀(FM1X +916 = 0xB0|vdir면 새 형식, 0xA0|vdir인 0.8.2 이전 FMY262 A2M은 그대로). 악기 번호가 있으면 음이 없어도 볼륨 초기화(같은 악기 + 볼륨 잠금이면 안 함)
- AdPlug 2.4의 비브라토 깊이는 AT2 소스(`calc_vibtrem_shift` = 깊이×표 >> 7)의 두 배라 깊이는 AdPlug를 믿지 말 것. AT2 SDL은 Nuked 1.6 파스칼판(쓰기 즉시, 같은 틱 키오프→키온은 다시 울림 = DBOPL과 같음)
- 비교 도구: `tests/rad/opl_dump.cpp`(AdPlug로 틱마다 OPL 상태, `OPL_DUMP_ALL`이면 512 레지스터 + 그 틱에 키오프를 쓴 채널), 남은 차이는 줄인 비브라토 표의 계단(±30센트 안)

## 지켜야 할 것

- 엔진 동작을 바꾸면 `tests/` 왕복·재생 테스트와 t39(실제 AT2 곡)로 확인
- A2M 출력은 AT2 소스 기반 검사 도구(CRC 일치)와 AdPlug 재생으로 검증해 왔다. 형식을 건드리면 같은 확인을 반복할 것
- 참고 소스: Adlib Tracker II 소스(adlibtracker.net 배포본의 `adt2unit.pas`, `typcons1.inc`), 매뉴얼 adlibtracker.net/files/adtrack2.htm
