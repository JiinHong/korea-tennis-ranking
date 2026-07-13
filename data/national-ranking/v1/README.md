# National ranking source dataset v1

`dataset.json` is the canonical, visually verified source manifest for the
national university club ranking. Version `sources-2026-07-13-v3` contains the
complete Yanggu, Gyeongin, Inje, Chuncheon, and WEMIX source program: 26
editions and 1,116 terminal result records. Yeongwol is not part of this
dataset.

## Expected source units

The complete source program contains 26 edition/gender units. Every unit is a
separate men's or women's draw:

| Tournament | Expected units |
| --- | --- |
| Yanggu | `yanggu-2023-men`, `yanggu-2023-women`, `yanggu-2024-men`, `yanggu-2024-women`, `yanggu-2025-men`, `yanggu-2025-women` |
| Gyeongin | `gyeongin-2023-men`, `gyeongin-2023-women`, `gyeongin-2024-men`, `gyeongin-2024-women`, `gyeongin-2025-men`, `gyeongin-2025-women` |
| Inje | `inje-2023-men`, `inje-2023-women`, `inje-2024-men`, `inje-2024-women`, `inje-2025-men`, `inje-2025-women` |
| Chuncheon | `chuncheon-2023-men`, `chuncheon-2023-women`, `chuncheon-2024-men`, `chuncheon-2024-women`, `chuncheon-2025-men`, `chuncheon-2025-women` |
| WEMIX | `wemix-2025-men`, `wemix-2025-women` |

WEMIX is the only 2025-only exception. All 26 units above are present.

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
`verified` only when the source explicitly pairs a university or campus with a
distinct club/team identity. The administrator-approved exception applies only
to visible champion and runner-up rows: a school-only label is frozen to that
school's highest-ranked same-gender canonical club before the inferred final
batch is added. The assignment is stored in `clubSlug` and never recomputed at
request time. Labels that do not identify even a school remain unresolved.

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

A verified edition requires exactly one champion-stage record and one
runner-up-stage record. Thirty-one school-qualified finals are frozen under the
rule above; only source labels `러비스 A` and `A`, which identify no school,
remain unassigned. 아주대학교 had no existing canonical candidate, so its
school-qualified final is represented conservatively as `아주대학교 테니스
동아리` until an administrator supplies the exact club name. An edition whose
field remains unresolved can still retain a concrete honor owner without
contributing points.

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
highest-ranked same-gender club from that university before WEMIX is added.
The two editions and all 20 terminal rows are therefore verified and scoreable.

## Unresolved mapping log

The conservative policy above leaves 639 of 1,116 rows unresolved. This is an
identity status only; every stored row's entrant name and terminal bracket
outcome was visually or structurally verified.

| Edition | Entrants/results | Verified rows | Unresolved rows | Reason summary |
| --- | ---: | ---: | ---: | --- |
| `yanggu-2023-men` | 98 | 2 | 96 | School-qualified final is frozen; other entrant labels lack a university/club identity key. |
| `yanggu-2023-women` | 91 | 2 | 89 | School-qualified final is frozen; other entrant labels lack a university/club identity key. |
| `yanggu-2024-men` | 89 | 69 | 20 | University-only and generic `테니스부` rows. |
| `yanggu-2024-women` | 73 | 56 | 17 | School-qualified final is frozen; generic identities and source-unresolved `라중` remain. |
| `yanggu-2025-men` | 94 | 37 | 57 | School-qualified final is frozen; remaining generic team labels lack a distinct club. |
| `yanggu-2025-women` | 73 | 25 | 48 | School-qualified final is frozen; remaining generic team labels lack a distinct club. |
| `inje-2023-men` | 18 | 2 | 16 | School-qualified final is frozen; other university/team labels remain unresolved. |
| `inje-2023-women` | 10 | 2 | 8 | School-qualified final is frozen; other university/team labels remain unresolved. |
| `inje-2024-men` | 20 | 18 | 2 | Generic university `테니스부` identities. |
| `inje-2024-women` | 10 | 10 | 0 | School-qualified runner-up is frozen. |
| `inje-2025-men` | 20 | 13 | 7 | School-qualified champion is frozen; other generic identities remain. |
| `inje-2025-women` | 12 | 7 | 5 | School-qualified finalists are frozen; other generic identities remain. |
| `gyeongin-2023-men` | 42 | 12 | 30 | Champion is frozen; runner-up `러비스 A` has no university context. |
| `gyeongin-2023-women` | 32 | 6 | 26 | Champion is frozen; runner-up is displayed only as `A`. |
| `gyeongin-2024-men` | 48 | 21 | 27 | Edition conflict above; DUTC is retained with an unresolved stage. |
| `gyeongin-2024-women` | 38 | 15 | 23 | School-qualified champion is frozen; other generic identities remain. |
| `gyeongin-2025-men` | 22 | 16 | 6 | School-qualified finalists are frozen; other generic identities remain. |
| `gyeongin-2025-women` | 26 | 13 | 13 | School-qualified finalists are frozen; other generic identities remain. |
| `chuncheon-2023-men` | 50 | 21 | 29 | School-qualified champion is frozen; other generic identities remain. |
| `chuncheon-2023-women` | 42 | 15 | 27 | School-qualified finalists are frozen; other generic identities remain. |
| `chuncheon-2024-men` | 68 | 41 | 27 | School-qualified champion is frozen; other generic identities remain. |
| `chuncheon-2024-women` | 34 | 11 | 23 | School-qualified runner-up is frozen; other generic identities remain. |
| `chuncheon-2025-men` | 58 | 32 | 26 | School-qualified runner-up is frozen; other generic identities remain. |
| `chuncheon-2025-women` | 28 | 11 | 17 | School-qualified runner-up is frozen; other generic identities remain. |
| `wemix-2025-men` | 8 | 8 | 0 | School-only entries are frozen under the approved pre-WEMIX ranking rule. |
| `wemix-2025-women` | 12 | 12 | 0 | Explicit aliases, clipped labels, and school-only entries are frozen under the approved rule. |
