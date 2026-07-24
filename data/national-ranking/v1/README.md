# National ranking source dataset v1

`dataset.json` is the canonical, visually verified source manifest for the
national university club ranking. Version `sources-2026-07-24-v9` contains the
complete Yanggu, Gyeongin, Inje, Chuncheon, and WEMIX source program: 28
editions and 1,170 terminal result records. Yeongwol is not part of this
dataset.

## Expected source units

The complete source program contains 28 edition/gender units. Every unit is a
separate men's or women's draw:

| Tournament | Expected units |
| --- | --- |
| Yanggu | `yanggu-2023-men`, `yanggu-2023-women`, `yanggu-2024-men`, `yanggu-2024-women`, `yanggu-2025-men`, `yanggu-2025-women` |
| Gyeongin | `gyeongin-2023-men`, `gyeongin-2023-women`, `gyeongin-2024-men`, `gyeongin-2024-women`, `gyeongin-2025-men`, `gyeongin-2025-women` |
| Inje | `inje-2023-men`, `inje-2023-women`, `inje-2024-men`, `inje-2024-women`, `inje-2025-men`, `inje-2025-women`, `inje-2026-men`, `inje-2026-women` |
| Chuncheon | `chuncheon-2023-men`, `chuncheon-2023-women`, `chuncheon-2024-men`, `chuncheon-2024-women`, `chuncheon-2025-men`, `chuncheon-2025-women` |
| WEMIX | `wemix-2025-men`, `wemix-2025-women` |

WEMIX is the only 2025-only exception. All 28 units above are present.

## Source references

The extraction archive used for this manifest was `~/Documents/테니스 랭킹`,
but tests do not assume that personal path. All committed `sourceRefs` are
relative to the archive root; absolute machine paths are forbidden. A PNG
result or edition references the image path. Every PDF reference at both the
edition and result level appends a one-based page anchor, for example
`양구/2025/남자/2025 양구 남자.pdf#page=3`.
XLSX references append the structurally parsed sheet name, for example
`춘천/2025/남자/2025년_남자부_64강부터_결승_전체대진.xlsx#sheet=전체 대진`.
Every result reference is an exact member of its edition's `sourceRefs`.

Normal tests verify those relative-reference and membership contracts
hermetically. To additionally verify that every referenced source file exists
in a local archive, opt in with an explicit absolute root:

```bash
NATIONAL_RANKING_SOURCE_ROOT="/absolute/path/to/테니스 랭킹" \
  npm test -- lib/nationalRanking/dataset.test.ts
```

One visually verified terminal record is stored for every named entrant.
`actualEntrants` therefore equals the number of result rows for each edition.
`gyeongin-2024-men` retains `DUTC A팀` with a null stage because the supplied
screenshots conflict about its terminal result. BYE slots and other
non-team placeholders are excluded. An entrant that loses its first played
match is `first_match_loss`, including when its first played match follows one
or more BYEs. A source-marked `w.o.`, `Dis.`, `Disqualified`, or `Ret.` records
only the observed bracket outcome; notes do not infer a reason.

`sourceEntryId` is optional and used only when independently slotted source
entries have identical visible names and team labels. Gyeongin 2024 men's two
UI-clipped `한국항공대학교 ACE...` entries use `slot-35` and `slot-46`; their
source names and empty team labels remain exact.

## Club identity and aliases

The club, not the university, is the ranking entity. Ordinary result rows are
`verified` when the source explicitly pairs a university or campus with a
distinct club/team identity. When the administrator confirms that a university
has one consolidated tennis club, reviewed team letters and nicknames from that
university are also assigned to the canonical club. Version
`sources-2026-07-24-v9` extends that decision to every stored result whose
university has exactly one unambiguous club in the public ranking. Universities
with multiple clubs, colleges, or campuses remain unresolved until their club
identity is confirmed. The assignment is a reviewed data migration rather than
a request-time text-matching fallback. The
administrator-approved school-only exception for visible champion and runner-up
rows freezes each label to that school's highest-ranked same-gender canonical
club before the inferred final batch is added. The assignment is stored in
`clubSlug` and never recomputed at request time. The separately confirmed Seoul
National University rule maps
`서울대`, `서울대학교`, and `서울대(학교) 테니스부` labels to the canonical
`서울대학교 테니스부` club; only labels that explicitly contain `TNT`
map to `서울대학교 경영대학 TNT`. Labels that do not identify even a school
remain unresolved.

Canonical clubs consolidate visually explicit spellings plus the
administrator-confirmed team-name families documented in the 2026-07-13
design. These include 경기대학교 `KTF`/`Kft`/`테토남`, 연세대학교
`YUTT`/`자유`/`정의`/`진리`/`더트루트루쓰`, 연세대학교
`쿠크다스`/`쿠크리스`, and the other confirmed aliases covered by dataset
tests. Unconfirmed clubs at the same university remain distinct. Korea
University KUTC, PETC, and KMTC are therefore still independent ranking
entities.

Campus is part of identity. 단국대학교 천안캠퍼스 DKUTC and 단국대학교
죽전캠퍼스 DKUTC are separate clubs; campus-unspecified historical rows are
frozen to 천안 for women and 죽전 for men. Aliases use an NFKC-normalized,
lowercased combination of canonical university context and the exact reported
team name; `sourceLabel` preserves the source spelling.

The visually clipped `KtcJtc` source label is frozen to the joint
`경상국립대학교 가좌 KTC·칠암 JTC 연합팀` entrant. The clubs' official 2024
Yanggu post confirms that Gajwa-campus KTC and Chilam-campus JTC entered
together as Gyeongsang National University's representative team. The earlier
Gangneung association was unsupported and was corrected in
`sources-2026-07-23-v5`.

Version `sources-2026-07-23-v6` applies the completed affiliation audit to
canonical display fields. Confirmed campuses, colleges, departments, and
official club spellings now appear in `universityName`, `clubName`, and
`displayName`. Historical `sourceTeamName`, `sourceLabel`, and source
references remain unchanged so the imported brackets stay auditable.

A verified edition requires exactly one champion-stage record and one
runner-up-stage record. Thirty-one school-qualified finals are frozen under the
rule above; only source labels `러비스 A` and `A`, which identify no school,
remain unassigned. 아주대학교의 canonical candidate is the
university-confirmed `아주대학교 ATC`. An edition whose field remains unresolved
can still retain a concrete honor owner without contributing points.

OCR may help locate text, but no OCR output becomes `verified` without visual
confirmation against the source image or rendered PDF page. Illegible or
ambiguous identities stay unresolved.

## Source conflicts

`gyeongin-2024-men` remains source-unresolved because image 003 shows `DUTC
A팀` beating `단국대 A`, while image 007 advances `단국대 A` into the Round of
16. The 48 named entrants are retained, `DUTC A팀` is stored with a null stage,
and the farthest explicit `단국대 A` terminal result is stored separately. No
result from this edition contributes points.

Both WEMIX editions use the visually confirmed local final-stage draws: 8 men's
teams and 12 women's teams, rather than the planning document's proposed
fields. The men's image makes 서울대학교 champion and the women's image makes
the clipped 과기대 느티나무 label champion over 고려대 KUTC. Under the
administrator-approved school-only rule, each visible entry is frozen to the
highest-ranked same-gender club from that university before WEMIX is added,
except that 서울대학교 follows the separately confirmed 테니스부 club rule.
The two editions and all 20 terminal rows are therefore verified and scoreable.

## Unresolved mapping log

The policy above leaves 247 of 1,170 rows unresolved. Version
`sources-2026-07-24-v9` assigned 332 previously unresolved university-only team
labels to the university's sole public ranking club. This is an identity status
only; every stored row's entrant name and terminal bracket outcome was visually
or structurally verified.

| Edition | Entrants/results | Verified rows | Unresolved rows | Reason summary |
| --- | ---: | ---: | ---: | --- |
| `yanggu-2023-men` | 98 | 47 | 51 | Remaining labels identify a multi-club university or lack sufficient university/club context. |
| `yanggu-2023-women` | 91 | 36 | 55 | Remaining labels identify a multi-club university or lack sufficient university/club context. |
| `yanggu-2024-men` | 89 | 83 | 6 | Generic club-only and multi-club university labels remain. |
| `yanggu-2024-women` | 73 | 67 | 6 | Generic club-only, multi-club university, and source-unresolved `라중` labels remain. |
| `yanggu-2025-men` | 94 | 80 | 14 | Generic club-only and multi-club university labels remain. |
| `yanggu-2025-women` | 73 | 58 | 15 | Generic club-only and multi-club university labels remain. |
| `inje-2023-men` | 18 | 13 | 5 | Generic club-only and multi-club university labels remain. |
| `inje-2023-women` | 10 | 10 | 0 | All identities are assigned. |
| `inje-2024-men` | 20 | 19 | 1 | Generic university `테니스부` identities remain except for confirmed Seoul National University entries. |
| `inje-2024-women` | 10 | 10 | 0 | School-qualified runner-up is frozen. |
| `inje-2025-men` | 20 | 20 | 0 | All identities are assigned. |
| `inje-2025-women` | 12 | 10 | 2 | Generic club-only labels remain. |
| `inje-2026-men` | 36 | 36 | 0 | All identities are assigned. |
| `inje-2026-women` | 18 | 18 | 0 | All identities are assigned. |
| `gyeongin-2023-men` | 42 | 26 | 16 | Generic labels remain; runner-up `러비스 A` has no university context. |
| `gyeongin-2023-women` | 32 | 17 | 15 | Generic labels remain; runner-up is displayed only as `A`. |
| `gyeongin-2024-men` | 48 | 40 | 8 | Edition conflict above remains; other generic or multi-club labels await confirmation. |
| `gyeongin-2024-women` | 38 | 31 | 7 | Generic club-only and multi-club university labels remain. |
| `gyeongin-2025-men` | 22 | 22 | 0 | All identities are assigned. |
| `gyeongin-2025-women` | 26 | 21 | 5 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2023-men` | 50 | 43 | 7 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2023-women` | 42 | 34 | 8 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2024-men` | 68 | 63 | 5 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2024-women` | 34 | 29 | 5 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2025-men` | 58 | 49 | 9 | Generic club-only and multi-club university labels remain. |
| `chuncheon-2025-women` | 28 | 21 | 7 | Generic club-only and multi-club university labels remain. |
| `wemix-2025-men` | 8 | 8 | 0 | School-only entries are frozen under the approved pre-WEMIX ranking rule. |
| `wemix-2025-women` | 12 | 12 | 0 | Explicit aliases, clipped labels, and school-only entries are frozen under the approved rule. |
