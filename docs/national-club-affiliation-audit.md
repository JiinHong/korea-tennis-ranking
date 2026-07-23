# 전국 대학 테니스 동아리 소속 조사

- 조사일: 2026-07-23
- 조사 대상: `data/national-ranking/v1/dataset.json`의 63개 동아리
- 데이터 버전: `sources-2026-07-23-v6`
- 조사 범위: 대학, 캠퍼스, 단과대학·학과, 중앙동아리 여부, 동명이 동아리와 중복 표기 가능성

`sources-2026-07-23-v6`에서 확정된 캠퍼스·단과대학·학과와 공식 동아리
표기를 정규 데이터와 운영 DB에 반영했다. 아래 첫 번째 표기 열은 비교를
위한 조사 전 값이며, 대회 원자료의 당시 팀명과 교명은 변경하지 않았다.

## 판정 기준

| 표시 | 의미 |
| --- | --- |
| A | 대학·단과대학 공식 페이지, 공식 동아리 목록 또는 대학 공식 문서로 확인 |
| B | 대학 언론, 공식 동아리 Instagram·채널, 과거 대학 공식 문서 등으로 강하게 확인 |
| 사용자 확인 | 운영자가 직접 확인한 소속 또는 통합 관계 |
| C | 대회 원자료의 팀명 외에는 공개 근거가 부족해 추가 확인 필요 |

공식 자료가 존재하지 않는 경우 검색 결과만으로 학과나 캠퍼스를 추정하지 않았다. Google에 노출되는 Instagram 결과도 계정명만 보지 않고, 공식 프로필이나 모집·대회 게시물에 소속이 직접 적힌 경우에만 근거로 사용했다. 또한 대회에 출전한 팀 단위와 실제 동아리 조직 단위가 다를 수 있으므로, 연합 동아리와 같은 이름의 캠퍼스별 동아리는 별도로 표시했다.

## 전체 조사 결과

| # | 조사 전 사이트 표기 | 조사 결과와 권장 표기 | 소속 유형 | 판정 | 근거·주의사항 |
| ---: | --- | --- | --- | --- | --- |
| 1 | 가톨릭대학교 코트랑 | **가톨릭대학교 성심교정 코트랑** | 중앙동아리 | A | 대학이 유일한 중앙 테니스 동아리로 소개한다. [가톨릭대 중앙동아리](https://www.catholic.ac.kr/ko/campuslife/club.do), [대학 공식 소개](https://www.catholic.ac.kr/ko/newsroom/photonews.do?article.offset=336&articleLimit=16&articleNo=162420&mode=view&srSearchVal=14) |
| 2 | 중앙대학교 Love4T | **중앙대학교 서울캠퍼스 LOVE4T** | 서울캠퍼스 중앙동아리 | A | 공식 서울캠퍼스 동아리 목록에 등재되어 있다. [중앙대 동아리연합회](https://www.cau.ac.kr/cms/FR_CON/index.do?MENU_ID=1470), [중대신문](https://news.cauon.net/news/articleView.html?idxno=20638) |
| 3 | 충남대학교 굿샷 | **충남대학교 굿샷** | 대학 체육동아리 | A | 대학 70년사 공식 문서의 체육동아리 목록에서 확인된다. [충남대 70년사](https://plus.cnu.ac.kr/Upl/kr/70y/16.pdf) |
| 4 | 단국대학교 천안캠퍼스 DKUTC | **단국대학교 천안캠퍼스 DKUTC** | 천안캠퍼스 동아리 | A | 천안캠퍼스 학생회관에 별도 동아리실이 있다. [단국대 천안 동아리](https://grec.dankook.ac.kr/web/kor/-520) |
| 5 | 단국대학교 죽전캠퍼스 DKUTC | **단국대학교 죽전캠퍼스 DKUTC** | 죽전캠퍼스 동아리 | A | 죽전캠퍼스 혜당관에 별도 동아리실이 있다. [단국대 죽전 동아리](https://www.dankook.ac.kr/-519) |
| 6 | 동국대학교 DUTC | **동국대학교 서울캠퍼스 DUTC** | 서울캠퍼스 중앙동아리 | B | 서울캠퍼스 공식 가이드와 현재 활동 계정 `dutc_seoul_1973`에서 확인된다. WISE캠퍼스에도 같은 약자의 별도 동아리가 있으므로 캠퍼스를 생략하면 안 된다. [서울캠퍼스 가이드](https://www.dongguk.edu/resources/files/ot_2025.pdf), [서울 DUTC](https://www.instagram.com/dutc_seoul_1973/), [WISE DUTC](https://wise.dongguk.ac.kr/article/wisestudent/detail/512796) |
| 7 | 이화여자대학교 스매시 | **이화여자대학교 체육과학부 SMASH** | 체육과학부 학과동아리 | A | 학부 공식 페이지가 체육과학부 소속 테니스 동아리로 명시한다. [체육과학부 동아리](https://cmsfox.ewha.ac.kr/sportsstudies/student/club.do) |
| 8 | 이화여자대학교 이화테니스 | **이화여자대학교 이화테니스** | 중앙 체육동아리 | A | 대학 공식 중앙동아리 안내에서 SMASH와 별개 조직으로 확인된다. [2025 중앙동아리 안내](https://isa.ewha.ac.kr/bbs/oisa/175/13328/download.do) |
| 9 | 가천대학교 타이브레이크 | **가천대학교 글로벌캠퍼스 타이브레이크** | 글로벌캠퍼스 중앙동아리 | A | 공식 안내가 글로벌캠퍼스 유일 중앙 테니스 동아리로 설명한다. [가천대 중앙동아리 안내](https://www.ic.ac.kr/kor/9856/subview.do) |
| 10 | 강릉국립대학교 KTCJTC | **경상국립대학교 KTC·JTC** | 가좌·칠암캠퍼스 연합 출전팀 | B | KTC 공식 게시물이 2024 양구 대회에 KTC와 JTC가 경상국립대 대표로 함께 출전했다고 명시한다. KTC는 가좌캠퍼스, JTC는 칠암캠퍼스 동아리다. 현재 데이터의 강릉국립대 연결은 잘못되어 `sources-2026-07-23-v5`에서 수정했다. [KTC·JTC 양구 출전 기록](https://www.instagram.com/p/C_rzOA2PBJP/), [KTC 공식 계정](https://www.instagram.com/gnu_tennis_ktc/) |
| 11 | 강원대학교 SHOT | **강원대학교 삼척캠퍼스 SHOT** | 삼척캠퍼스 동아리 | A | 대학 공식 동아리 목록에서 삼척캠퍼스 소속으로 확인된다. [강원대 삼척캠퍼스 동아리](https://kangwon.ac.kr/ko/conts/851/web.do) |
| 12 | 경기대학교 Ktf | **경기대학교 수원캠퍼스 KTF** | 수원캠퍼스 중앙동아리 | B | 경기대 수원 테니스장과 KTF 활동이 함께 확인되며, 수원캠퍼스 중앙동아리 자료와 일치한다. [대회·동아리 기록](https://gall.dcinside.com/board/view/?id=tennis&no=59026) |
| 13 | 한밭대학교 마스터즈 | **국립한밭대학교 마스터즈** | 중앙 체육동아리 | A | 공식 입학 가이드의 동아리 목록에서 `마스터즈(테니스)`로 확인된다. [한밭대 가이드북](https://www.hanbat.ac.kr/images/admission/sub01/hanbat_guidebook__2024.pdf) |
| 14 | 한양대학교 ERICA 하이텍 | **한양대학교 ERICA캠퍼스 HiTEC** | ERICA 중앙동아리 | A | ERICA 공식 중앙동아리 안내에서 확인된다. [한양대 ERICA 동아리](https://heca.hanyang.ac.kr/ko/-14) |
| 15 | 한양대학교 HYTC | **한양대학교 서울캠퍼스·한양여자대학교 연합 HYTC** | 대학 간 연합동아리 | B | 대학 위키와 공식 동아리 프로필이 모두 한양대·한양여대 연합 동아리라고 명시한다. 대회에서는 학교별 팀으로 따로 출전하므로 랭킹 엔티티 통합 여부는 별도 정책이 필요하다. [HYTC 소개](https://hyu.wiki/HYTC), [HYTC 공식 계정](https://www.instagram.com/hytc_1967/) |
| 16 | 한양여자대학교 HYTC | **한양대학교 서울캠퍼스·한양여자대학교 연합 HYTC** | 대학 간 연합동아리 | B | 15번과 같은 조직이다. 대회 결과가 학교별로 나뉘어 기록된 경우만 별도 점수 엔티티로 유지할 수 있다. [HYTC 소개](https://hyu.wiki/HYTC), [HYTC 공식 계정](https://www.instagram.com/hytc_1967/) |
| 17 | 홍익대학교 HITC | **홍익대학교 서울캠퍼스 HITC** | 서울캠퍼스 중앙동아리 | A | 서울캠퍼스 공식 체육동아리 목록에 등재되어 있다. [홍익대 서울캠퍼스 동아리](https://www.hongik.ac.kr/kr/life/seoul-sports.do) |
| 18 | 인하대학교 라품 | **인하대학교 중앙동아리 라품** | 중앙동아리 | B·사용자 확인 | 공식 동아리 프로필이 중앙동아리임을 명시한다. 운영자가 확인한 비룡·라품·라쿤 팀명은 같은 동아리의 별칭으로 유지한다. [라품 공식 계정](https://www.instagram.com/inha_lapaume/) |
| 19 | 인천대학교 UITC | **인천대학교 UITC** | 중앙동아리 | A | 대학 공식 중앙동아리 목록에서 확인된다. [인천대 동아리](https://www.inu.ac.kr/inu/884/subview.do) |
| 20 | 전북대학교 ACE | **전북대학교 ACE** | 중앙동아리 | A | 대학 공식 캠퍼스 가이드의 동아리 목록에서 확인된다. [전북대 캠퍼스 가이드](https://molb.jbnu.ac.kr/bbs/molb/729/261272/download.do) |
| 21 | KAIST Stroke | **KAIST 학부 테니스 동아리 STROKE** | 학부 동아리 | B | KAIST 구성원 자료에서 학부 테니스 동아리로 확인된다. [KAIST 활동 이력](https://gunh.ee/ac/kaist/bs) |
| 22 | 한국체육대학교 Alley | **한국체육대학교 사회체육학과 ALLEY** | 사회체육학과 동아리 | A | 대학 공식 동아리 목록의 소속·지도교수 정보가 사회체육학과로 표시된다. [한국체대 동아리](https://las.knsu.ac.kr/knsu/unilife/years-of-2025.do) |
| 23 | 건국대학교 KTC | **건국대학교 서울캠퍼스 KTC** | 중앙 체육동아리 | A | 대학 공식 중앙동아리 안내에서 확인된다. [건국대 동아리 안내](https://beauty.konkuk.ac.kr/bbs/cse/775/1182683/download.do) |
| 24 | 국민대학교 KMTC | **국민대학교 KMTC** | 중앙동아리 | A | 대학 공식 웹진에서 중앙 테니스 동아리로 소개한다. [국민대 웹진](https://webzine.kookmin.ac.kr/webzine.php?mcode=40&svolume=1&syear=2023) |
| 25 | 고려대학교 KUTC | **고려대학교 KUTC** | 일반 학생 테니스 동아리 | B | 공개 모집문에서 체육교육과·의과대학과 구분되는 일반 고려대생 동아리로 확인된다. 중앙동아리 등록 여부는 추가 확인이 필요하므로 운영자 지시에 따라 캠퍼스 표현은 붙이지 않는다. [KUTC 모집 기록](https://www.koreapas.com/m/view.php?id=freead&no=238098) |
| 26 | 고려대학교 PETC | **고려대학교 체육교육과 PETC** | 사범대학 체육교육과 동아리 | 사용자 확인 | 운영자가 학과 소속임을 확인했다. [고려대 체육교육과](https://phyedu.korea.ac.kr/) |
| 27 | 경희대학교 국제캠퍼스 임팩트 | **경희대학교 국제캠퍼스 공과대학 IMPACT** | 공과대학 동아리 | B | 공식 프로필이 `경희대학교 공과대학 테니스동아리`라고 명시한다. 공과대학은 국제캠퍼스 소속이므로 캠퍼스와 단과대학을 함께 표기하는 것이 정확하다. [IMPACT 공식 계정](https://www.instagram.com/khu_impact/) |
| 28 | 경희대학교 국제캠퍼스 KUTA | **소속 재확인 필요: 국제캠퍼스 KUTA** | 미확정 | C | 공개된 KUTA 공식 계정과 대학 자료는 서울캠퍼스 중앙동아리만 확인해 준다. 별도의 국제캠퍼스 KUTA를 뒷받침하는 공식 Instagram·대학 자료는 찾지 못했다. [KUTA 공식 계정](https://www.instagram.com/kuta_tennis/) |
| 29 | 경희대학교 국제캠퍼스 러비스 | **경희대학교 국제캠퍼스 LOVICE(러비스)** | 국제캠퍼스 중앙동아리 | A | 국제캠퍼스 총동아리연합회에서 별도 중앙동아리로 확인된다. [경희대 국제캠퍼스 동아리](https://jajudy.khu.ac.kr/club) |
| 30 | 경희대학교 서울캠퍼스 KUTA | **경희대학교 서울캠퍼스 KUTA** | 서울캠퍼스 중앙동아리 | A | 대학 공식 중앙동아리 목록과 대학 언론에서 확인된다. [경희대 서울캠퍼스 동아리](https://www.khu.ac.kr/kor/user/contents/view.do?menuNo=200188), [대학주보](https://media.khu.ac.kr/bbs/board.php?bo_table=univJubo&wr_id=34810) |
| 31 | 경북대학교 대구캠퍼스 KUTC | **경북대학교 대구캠퍼스 KUTC** | 대표 체육동아리 | A | 대학 공식 게시물에서 대표 체육동아리로 확인된다. [경북대 KUTC](https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/viewBtin.action?bbs_cde=28&btin.appl_no=000000&btin.bbs_cde=28&btin.doc_no=1336060&btin.note_div=row&btin.page=1&menu_idx=214) |
| 32 | 명지대학교 러시앤 | **소속 재확인 필요: 명지대학교 러시앤** | 미확정 | C | 현재 공식 인문캠퍼스 중앙 테니스 동아리는 MJTA로 표시된다. 러시앤이 과거명·팀명·자연캠퍼스 동아리인지 확인이 필요하다. [명지대 MJTA](https://ddingdong.mju.ac.kr/club/29) |
| 33 | 명지대학교 테사랑 | **소속 재확인 필요: 명지대학교 테사랑** | 미확정 | C | 현재 공식 MJTA와의 관계를 확인할 공개 근거가 없다. 대회 원자료에는 독립 팀명으로 존재한다. [명지대 MJTA](https://ddingdong.mju.ac.kr/club/29) |
| 34 | 명지대학교 티샷 | **소속 재확인 필요: 명지대학교 티샷** | 미확정 | C | 현재 공식 MJTA와의 관계를 확인할 공개 근거가 없다. 대회 원자료에는 독립 팀명으로 존재한다. [명지대 MJTA](https://ddingdong.mju.ac.kr/club/29) |
| 35 | 세종대학교 STC | **세종대학교 STC** | 중앙동아리 | A | 대학 공식 동아리 목록에서 확인된다. [세종대 동아리](https://www.sejong.ac.kr/kor/unilife/clubs.do) |
| 36 | 서울과학기술대학교 느티나무 | **서울과학기술대학교 느티나무** | 중앙동아리 | A | 대학 공식 중앙동아리 목록과 대학 언론에서 확인된다. [서울과기대 동아리](https://www.seoultech.ac.kr/life/student/organ/club), [서울과기대신문](https://times.seoultech.ac.kr/reports?category=139&idx=21790) |
| 37 | 서강대학교 SGTC | **서강대학교 SGTC** | 중앙동아리 | A | 공식 총동아리연합회가 유일 중앙 테니스 동아리로 소개한다. [서강대 동아리](https://dongyeon.sogang.ac.kr/front/cmsboardlist.do?bbsConfigFK=6615&siteId=dongyeon) |
| 38 | 숭실대학교 SSTC | **숭실대학교 SSTC** | 중앙동아리 | B | 공식 동아리 채널에서 1969년 창립 중앙동아리로 소개한다. [SSTC 공식 링크](https://linktr.ee/sstc1969) |
| 39 | 성균관대학교 STC | **성균관대학교 STC** | 중앙 체육동아리 | A | 대학 공식 동아리 자료에서 확인된다. 다만 공자·맹자·순자·SIT를 모두 STC로 합친 현재 별칭 규칙은 캠퍼스별 팀명 여부를 운영자에게 재확인해야 한다. [성균관대 동아리](https://skkuzine.skku.edu/skku/campus/activities/stuOrgan01.do?mode=list&srCategoryId1=1) |
| 40 | 울산대학교 UTC | **울산대학교 UTC** | 대학 체육동아리 | B | 대학 공식 과거 요람에서 확인된다. 현재 활동 상태를 보여 주는 최신 공식 페이지는 찾지 못했다. [울산대 통계연보](https://oak.ulsan.ac.kr/bitstream/2021.oak/9693/2/Statisticalyearbook09.pdf) |
| 41 | 서울시립대학교 어프로치 | **서울시립대학교 UOSTC(어프로치)** | 중앙동아리 | A | 대학 공식 명칭은 UOSTC이며 서울시 체육 자료에서 어프로치와 같은 조직으로 확인된다. [서울시립대 동아리](https://www.uos.ac.kr/kor/html/life/campusLife/club/club.do?identified=anonymous), [서울시 체육](https://sports.seoul.go.kr/main/board/10/7684/board_view.do) |
| 42 | 영남대학교 YUTA | **영남대학교 YUTA** | 대학 테니스 동아리 | A | 대학 공식 테니스장 안내에서 YUTA 활동이 확인된다. 같은 학교의 `청심`은 별도 동아리지만 현재 랭킹에는 없다. [영남대 테니스장](https://www.yu.ac.kr/main/life/tennis-field.do) |
| 43 | 연세대학교 쿠크다스 | **연세대학교 상경·경영대학 쿠크다스** | 단과대학 동아리 | A | 공식 동아리연합회가 상경·경영대학 단위동아리로 분류한다. [연세대 동아리연합회](https://dongari.yonsei.ac.kr/kr/dongari/category_view.php?part_idx=17) |
| 44 | 연세대학교 YUTT | **연세대학교 신촌캠퍼스 YUTT** | 대학 테니스 동아리 | B | 공식 동아리 채널에서 연세대 테니스 팀으로 확인된다. 중앙동아리 등록 여부는 추가 확인이 필요하다. [YUTT 공식 채널](https://www.instagram.com/yonsei_tennis_yutt/) |
| 45 | 충북대학교 에이스 | **충북대학교 ACE** | 중앙동아리 | B | 공식 동아리 채널이 충북대 중앙동아리로 소개한다. [ACE 공식 채널](https://www.instagram.com/cbnu_tennis_ace/) |
| 46 | 단국대학교 ACE | **단국대학교 천안캠퍼스 치과대학 ACE** | 치과대학 학과동아리 | A | 치과대학 공식 페이지에서 확인된다. DKUTC와 합치면 안 되는 별도 조직이다. [단국대 치과대학 동아리](https://cms.dankook.ac.kr/web/dentistry/-14) |
| 47 | 강릉원주대학교 LOVE | **강원대학교 강릉캠퍼스 LOVE** *(구 국립강릉원주대학교)* | 강릉캠퍼스 중앙동아리 | A | 2026년 통합 후 강원대 공식 강릉캠퍼스 동아리 목록에 등재되어 있다. 역사 성적에는 당시 교명을 보존하는 편이 좋다. [강원대 강릉캠퍼스 동아리](https://www.kangwon.ac.kr/ko/conts/329/web.do) |
| 48 | 경인교육대학교 러브에이스 | **경인교육대학교 러브에이스** | 대학 체육동아리 | A | 대학 공식 동아리 목록에서 확인된다. [경인교대 동아리](https://www.ginue.ac.kr/kor/CMS/Contents/Contents.do?mCode=MN118) |
| 49 | 한남대학교 위너스 | **한남대학교 위너스** | 대학 테니스 동아리 | A | 대학 공식 게시물과 대학 안내 자료에서 확인된다. [한남대 게시물](https://www.hannam.ac.kr/kor/community/community_01_2.html?pPostNo=72581) |
| 50 | 한국항공대학교 ACE | **한국항공대학교 ACE** | 중앙동아리 | A | 대학 공식 중앙동아리 목록에서 확인된다. [한국항공대 동아리](https://kau.ac.kr/kaulife/club.php) |
| 51 | 고려대학교 KMTC | **고려대학교 의과대학 KMTC** | 의과대학 동아리 | A | 의과대학 공식 소식지에서 확인된다. KUTC·PETC와 별도 조직이다. [고려대 의과대학 소식지](https://medicine.korea.ac.kr/html_portlet_repositories/images/ExtImgFile/10181/10208/102058/2015_7_8%EC%9B%94%ED%98%B8%EB%89%B4%EC%8A%A4%EB%A0%88%ED%84%B0.pdf) |
| 52 | 금오공과대학교 KOTC | **국립금오공과대학교 KOTC(금오테니스?)** | 대학 테니스 동아리 추정 | B | 2026년 교류전 게시물에서 KOTC가 현재 활동 중인 금오공대 테니스 동아리임은 확인된다. 다만 최신 대학 공식 자료의 `금오테니스`와 정확히 같은 조직인지까지는 확인되지 않았다. [금오공대 공식 안내](https://www.kumoh.ac.kr/cms/fileOpen.do?path=%2F_res%2Fipsi%2Fetc%2F2025susi_mozip.pdf), [KOTC 교류전 기록](https://www.instagram.com/p/DZC9S0agSIa/) |
| 53 | 광운대학교 KWTC | **광운대학교 KWTC** | 중앙동아리 | A | 대학 공식 중앙동아리 목록에서 확인된다. [광운대 동아리](https://www.kw.ac.kr/ko/life/activity03.jsp) |
| 54 | 경희대학교 임팩트 | **경희대학교 국제캠퍼스 공과대학 IMPACT와 통합 권장** | 캠퍼스 생략 표기 | B | 공식적으로 확인되는 경희대 IMPACT는 27번 공과대학 동아리이며, 캠퍼스가 생략된 춘천 원자료도 같은 조직으로 귀속하는 것이 가장 타당하다. [IMPACT 공식 계정](https://www.instagram.com/khu_impact/) |
| 55 | 경희대학교 KUTA | **경희대학교 서울캠퍼스 KUTA와 통합 검토** | 중복 표기 가능성 | B | KUTA의 공식 소속은 서울캠퍼스다. 캠퍼스가 생략된 결과는 30번으로 귀속하는 것이 가장 타당하다. [경희대 서울캠퍼스 동아리](https://www.khu.ac.kr/kor/user/contents/view.do?menuNo=200188) |
| 56 | 경희대학교 러비스 | **경희대학교 국제캠퍼스 LOVICE(러비스)와 통합 검토** | 중복 표기 가능성 | B | 공식 러비스는 국제캠퍼스 조직이다. 캠퍼스가 생략된 결과는 29번으로 귀속하는 것이 가장 타당하다. [경희대 국제캠퍼스 동아리](https://jajudy.khu.ac.kr/club) |
| 57 | 경희대학교 셔틀 | **소속 재확인 필요: 경희대학교 셔틀** | 미확정 | C | 춘천 2023 원자료 외에 공식 소속을 확인하지 못했다. 서울·국제캠퍼스와 학과동아리 여부를 확인해야 한다. |
| 58 | 남서울대학교 위닝샷 | **남서울대학교 스포츠건강관리학과 위닝샷** | 학과동아리 | B | 스포츠건강관리학과 공식 채널이 위닝샷을 테니스 학과동아리로 소개한다. [학과 공식 계정](https://www.instagram.com/nsu_sporthc/) |
| 59 | 상지대학교 ACE | **상지대학교 ACE** | 대학 체육동아리 | A | 대학 공식 동아리 목록에서 확인된다. [상지대 동아리](https://www.sangji.ac.kr/prog/club/kor/sub06_05_02/E/list.do) |
| 60 | 상명대학교 테슬라 | **상명대학교 서울캠퍼스 TESLA** | 서울캠퍼스 동아리 | B | 대학 언론의 활동 지역과 교류 기록상 서울캠퍼스 조직으로 확인된다. [상명대 학보](https://seng.smu.ac.kr/newspaper/university.do?article.offset=230&articleLimit=10&articleNo=749526&mode=view) |
| 61 | 서울대학교 테니스부 | **서울대학교 운동부 테니스부** | 대학 운동부 | A | 공식 체육대회 문서에서 대학 운동부 테니스부로 확인된다. TNT와 별도 조직이다. [서울대 공식 문서](https://cse.snu.ac.kr/api/v1/file/1695912819242_%28%EB%B6%99%EC%9E%841%29%202019%ED%95%99%EB%85%84%EB%8F%84%20%EC%84%9C%EC%9A%B8%EB%8C%80%ED%95%99%EA%B5%90%20%EC%A2%85%ED%95%A9%EC%B2%B4%EC%9C%A1%EB%8C%80%ED%9A%8C%20%EA%B0%9C%EC%B5%9C%28%EC%95%88%29.pdf) |
| 62 | 서울대학교 TNT | **서울대학교 경영대학 TNT** | 경영대학 동아리 | A | 경영대학 공식 학생활동 페이지에서 확인된다. 테니스부와 합치면 안 된다. [서울대 경영대학 동아리](https://cba.snu.ac.kr/campus/activities/club) |
| 63 | 아주대학교 테니스 동아리 | **아주대학교 ATC** | 대학 테니스 동아리 | A | 대학 공식 뉴스에서 ATC 명칭을 확인할 수 있다. [아주대 공식 뉴스](https://ns.ajou.ac.kr/kr/ajou/news.do?article.offset=12&articleLimit=12&articleNo=321247&mode=view) |

## 같은 대학에서 반드시 구분할 조직

### 단국대학교

- 죽전캠퍼스 DKUTC
- 천안캠퍼스 DKUTC
- 천안캠퍼스 치과대학 ACE

세 조직은 소속이 서로 다르므로 합치면 안 된다.

### 이화여자대학교

- 체육과학부 SMASH
- 중앙 체육동아리 이화테니스

### 한양대학교 계열

- 한양대학교 서울캠퍼스·한양여자대학교 연합 HYTC
- 한양대학교 ERICA캠퍼스 HiTEC

HYTC는 하나의 연합 동아리지만 대회에서 두 학교가 별도 팀으로 출전한 기록이 있다. **조직 표시는 하나로 설명하되 점수 엔티티는 대회 참가 학교를 보존하는 방식**이 안전하다.

### 고려대학교

- 일반 학생 동아리 KUTC
- 체육교육과 PETC
- 의과대학 KMTC

세 조직은 분명히 다른 소속이다.

### 경희대학교

- 서울캠퍼스 KUTA: 공식 확인
- 국제캠퍼스 LOVICE(러비스): 공식 확인
- 국제캠퍼스 공과대학 IMPACT: 공식 동아리 채널로 확인
- 국제캠퍼스 KUTA: 별도 조직인지 재확인 필요
- 셔틀: 캠퍼스·학과 미확정
- 캠퍼스가 빠진 KUTA·러비스·IMPACT: 각각 확인된 공식 캠퍼스 조직으로 귀속하는 것이 타당함

현재 8개로 나뉜 경희대 엔티티 중 KUTA·러비스·IMPACT의 캠퍼스 생략 표기는 통합할 근거가 마련됐다. 다만 `국제캠퍼스 KUTA`와 `셔틀`은 원자료를 다시 확인하기 전까지 별도 미확정 엔티티로 보존해야 한다.

### 명지대학교

- 러시앤
- 테사랑
- 티샷
- 현재 공식 인문캠퍼스 중앙동아리 MJTA

세 대회 출전명이 과거 동아리명, 팀 별칭, 자연캠퍼스 조직 중 무엇인지 공개 자료로 확인되지 않았다. 임의로 MJTA에 합치면 안 된다.

### 연세대학교

- 신촌캠퍼스 YUTT
- 상경·경영대학 쿠크다스

### 서울대학교

- 운동부 테니스부
- 경영대학 TNT

운영자 확인과 공식 자료가 일치하며, 서로 다른 조직이다.

## v6에 반영한 우선 표기

아래 항목은 공식 근거가 명확해 사이트 표시를 바로 구체화해도 위험이 낮다.

1. 가톨릭대학교 **성심교정** 코트랑
2. 중앙대학교 **서울캠퍼스** LOVE4T
3. 이화여자대학교 **체육과학부** SMASH
4. 가천대학교 **글로벌캠퍼스** 타이브레이크
5. 강원대학교 **삼척캠퍼스** SHOT
6. 홍익대학교 **서울캠퍼스** HITC
7. 한국체육대학교 **사회체육학과** ALLEY
8. 서울시립대학교 **UOSTC(어프로치)**
9. 연세대학교 **상경·경영대학** 쿠크다스
10. 단국대학교 **천안캠퍼스 치과대학** ACE
11. 고려대학교 **의과대학** KMTC
12. 강원대학교 **강릉캠퍼스** LOVE *(역사 교명은 결과에 보존)*
13. 상명대학교 **서울캠퍼스** TESLA
14. 서울대학교 **운동부** 테니스부
15. 서울대학교 **경영대학** TNT
16. 아주대학교 **ATC**
17. 동국대학교 **서울캠퍼스** DUTC
18. 경상국립대학교 **가좌 KTC·칠암 JTC 연합팀**
19. 인하대학교 **중앙동아리** 라품
20. 경희대학교 국제캠퍼스 **공과대학** IMPACT
21. 남서울대학교 **스포츠건강관리학과** 위닝샷

## 운영자 확인이 필요한 항목

1. 한양대·한양여대 HYTC를 랭킹에서 한 조직으로 합칠지, 출전 학교별로 유지할지
2. 경희대 국제캠퍼스 KUTA가 실제 별도 조직인지
3. 경희대 셔틀의 캠퍼스·학과
4. 명지대 러시앤·테사랑·티샷과 현재 MJTA의 관계
5. 성균관대 공자·맹자·순자·SIT가 모두 STC 팀명인지, 캠퍼스별 조직인지
6. 금오공대 KOTC와 현재 공식 명칭 `금오테니스`가 같은 조직인지

## 데이터에 추가하면 좋은 필드

표시명 하나에 대학·캠퍼스·학과를 모두 넣으면 이후 통합 과정에서 다시 혼동되기 쉽다. 다음 값을 분리해 보관하는 편이 안전하다.

```text
universityName        학교 법인·대학명
campusName            서울, 국제, ERICA, 죽전, 천안 등
collegeName           의과대학, 경영대학, 체육과학부 등
clubName              공식 동아리명
organizationType      central, campus, college, department, athletic_team, joint
jointInstitutions      연합 동아리일 때 참여 학교 목록
verificationStatus    verified, probable, unresolved
verificationSource    공식 근거 URL 또는 운영자 확인 기록
historicalNames       과거 교명과 과거 동아리명
```

이 구조를 사용하면 화면에는 짧은 이름을 유지하면서도, 상세 페이지에서 정확한 소속을 보여 주고 과거 대회 결과를 안전하게 연결할 수 있다.
