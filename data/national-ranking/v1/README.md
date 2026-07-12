# National ranking source dataset v1

`dataset.json` is the canonical, visually verified source manifest for the
national university club ranking. Version `sources-2026-07-12-v1` contains the
complete Yanggu, Gyeongin, Inje, Chuncheon, and WEMIX source program: 26
editions and 1,115 terminal result records. Yeongwol is not part of this
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
`actualEntrants` therefore equals the number of result rows for each edition
except `gyeongin-2024-men`. That edition has 48 named entrants but 47 stored
terminal records because `DUTC A팀` has a literally unresolved terminal stage
that cannot be represented by the approved stage union. BYE slots and other
non-team placeholders are excluded. An entrant that loses its first played
match is `first_match_loss`, including when its first played match follows one
or more BYEs. A source-marked `w.o.`, `Dis.`, `Disqualified`, or `Ret.` records
only the observed bracket outcome; notes do not infer a reason.

`sourceEntryId` is optional and used only when independently slotted source
entries have identical visible names and team labels. Gyeongin 2024 men's two
UI-clipped `한국항공대학교 ACE...` entries use `slot-35` and `slot-46`; their
source names and empty team labels remain exact.

## Club identity and aliases

The club, not the university, is the ranking entity. A result is `verified`
only when that same source row explicitly pairs a university or campus with a
distinct club/team identity. A university name followed only by `A`, `B`,
`C`, another generic team label, or a generic name such as `테니스부` remains
`unresolved` with `clubSlug: null`. A club mapping is never borrowed from a
different year or source.

Canonical clubs consolidate visually explicit spelling and case variants such
as `Kutc`/`KUTC`, `Hitc`/`HITC`, and `Ktf`/`KTF`. Source-explicit identities
remain distinct without evidence that they are variants: 경기대학교 `Kft` is
separate from `KTF`, and 연세대학교 `쿠크리스` is separate from `쿠크다스`.
Campus-qualified identities likewise remain separate when the source
distinguishes them. Aliases use an NFKC-normalized, lowercased combination of
canonical university context and the exact reported team name; `sourceLabel`
preserves the source spelling.

A verified edition requires exactly one champion-stage record and one
runner-up-stage record. Those records may still have
`qualityStatus: "unresolved"` and `clubSlug: null` when the source proves the
result but not a distinct club identity. No club mapping is fabricated to make
a champion or runner-up scoreable.

OCR may help locate text, but no OCR output becomes `verified` without visual
confirmation against the source image or rendered PDF page. Illegible or
ambiguous identities stay unresolved.

## Source conflicts

`gyeongin-2024-men` remains source-unresolved because image 003 shows `DUTC
A팀` beating `단국대 A`, while image 007 advances `단국대 A` into the Round of
16. The 48 named entrants are retained as the edition count, the farthest
explicit `단국대 A` terminal result is stored, and the stage-unresolved DUTC
row is omitted. No result from this edition contributes points.

Both WEMIX editions remain source-unresolved. The local final-stage images
support 8 men's and 12 women's names, not the official plan's `30+3` and
`18+3` fields. The men's image visibly makes `서울대학교` champion, contrary
to the plan's KUTC claim. The women's image makes the abbreviated `과기대
느티나무` champion over `고려대 KUTC`, but does not independently spell out
the champion's full university. Only the image-supported records are stored;
the plan claims are neither inferred nor scored.

## Unresolved mapping log

The conservative policy above leaves 681 of 1,115 rows unresolved. This is an
identity status only; every stored row's entrant name and terminal bracket
outcome was visually or structurally verified.

| Edition | Entrants/results | Verified club | Unresolved club | Reason summary |
| --- | ---: | ---: | ---: | --- |
| `yanggu-2023-men` | 98 | 0 | 98 | Draw has entrant labels but no university/club identity key. |
| `yanggu-2023-women` | 91 | 0 | 91 | Draw has entrant labels but no university/club identity key. |
| `yanggu-2024-men` | 89 | 69 | 20 | University-only and generic `테니스부` rows. |
| `yanggu-2024-women` | 73 | 55 | 18 | University-only, generic `테니스부`, and source-unresolved `라중`. |
| `yanggu-2025-men` | 94 | 36 | 58 | University plus team label only; no distinct club in those rows. |
| `yanggu-2025-women` | 73 | 24 | 49 | University plus team label only; no distinct club in those rows. |
| `inje-2023-men` | 18 | 0 | 18 | University/team labels only; no club column identity. |
| `inje-2023-women` | 10 | 0 | 10 | University/team labels only; no club column identity. |
| `inje-2024-men` | 20 | 18 | 2 | Generic university `테니스부` identities. |
| `inje-2024-women` | 10 | 9 | 1 | Generic university `테니스부` identity. |
| `inje-2025-men` | 20 | 12 | 8 | Seven university/team labels plus generic `서울대 테니스부`. |
| `inje-2025-women` | 12 | 5 | 7 | Six university/team labels plus generic `서울대 테니스부`. |
| `gyeongin-2023-men` | 42 | 11 | 31 | University/team labels, source-truncated identities, and acronyms without university context. |
| `gyeongin-2023-women` | 32 | 5 | 27 | University/team labels and source-only acronyms; runner-up is displayed only as `A`. |
| `gyeongin-2024-men` | 48 entrants / 47 results | 21 | 26 | Edition conflict above; one stage-unresolved DUTC row omitted. |
| `gyeongin-2024-women` | 38 | 14 | 24 | University/team labels and club acronyms without same-row university context. |
| `gyeongin-2025-men` | 22 | 14 | 8 | University/team labels and generic `테니스부` identities. |
| `gyeongin-2025-women` | 26 | 11 | 15 | University/team labels, campus-only labels, and generic `테니스부` identities. |
| `chuncheon-2023-men` | 50 | 20 | 30 | University/campus plus team labels without a distinct club. |
| `chuncheon-2023-women` | 42 | 13 | 29 | University/campus plus team labels without a distinct club. |
| `chuncheon-2024-men` | 68 | 40 | 28 | University/team labels and source-designated non-club nicknames. |
| `chuncheon-2024-women` | 34 | 10 | 24 | University/team labels and source-designated non-club nicknames. |
| `chuncheon-2025-men` | 58 | 31 | 27 | University/team labels, campus-only labels, and generic `테니스부` identities. |
| `chuncheon-2025-women` | 28 | 10 | 18 | University/team labels, campus-only labels, and source-designated non-club nicknames. |
| `wemix-2025-men` | 8 | 0 | 8 | Final-stage image uses university-only labels. |
| `wemix-2025-women` | 12 | 6 | 6 | Abbreviated/truncated champion identity, university-only labels, and campus-ambiguous KUTA. |
