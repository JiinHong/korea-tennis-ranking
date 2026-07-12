# National ranking source dataset v1

`dataset.json` is the canonical, visually verified source manifest for the
national university club ranking. Version `sources-2026-07-12-v1` contains the
Task 4 Yanggu and Inje tranche: 12 editions and 608 terminal result records.
Yeongwol is not part of this dataset.

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

WEMIX is the only 2025-only exception. This Task 4 manifest intentionally has
edition and result rows only for Yanggu and Inje; all five tournament
definitions are present so later source tranches share one stable catalog.

## Source references

The common source root is `~/Documents/테니스 랭킹`. All committed `sourceRefs`
are relative to that root; absolute machine paths are forbidden. A PNG result
references the image path. Every PDF result appends a one-based page anchor,
for example `양구/2025/남자/2025 양구 남자.pdf#page=3`. Edition-level
`sourceRefs` list the underlying source file without the page anchor.

One visually verified terminal record is stored for every named entrant.
`actualEntrants` therefore equals the number of result rows for each edition.
BYE slots and other non-team placeholders are excluded. An entrant that loses
its first played match is `first_match_loss`, including when its first played
match follows one or more BYEs. A source-marked `w.o.`, `Dis.`,
`Disqualified`, or `Ret.` records only the observed bracket outcome; notes do
not infer a reason.

## Club identity and aliases

The club, not the university, is the ranking entity. A result is `verified`
only when that same source row explicitly pairs a university or campus with a
distinct club/team identity. A university name followed only by `A`, `B`,
`C`, another generic team label, or a generic name such as `테니스부` remains
`unresolved` with `clubSlug: null`. A club mapping is never borrowed from a
different year or source.

Canonical clubs consolidate visually explicit spelling and case variants such
as `Kutc`/`KUTC`, `Hitc`/`HITC`, `Ktf`/`Kft`, and the reported Yonsei
`쿠크다스`/`쿠크리스` forms. Campus-qualified identities remain separate when
the source distinguishes them. Aliases use an NFKC-normalized, lowercased
combination of canonical university context and the exact reported team name;
`sourceLabel` preserves the source spelling.

OCR may help locate text, but no OCR output becomes `verified` without visual
confirmation against the source image or rendered PDF page. Illegible or
ambiguous identities stay unresolved.

## Unresolved mapping log

The conservative policy above leaves 380 of 608 rows unresolved. This is an
identity status only; every row's entrant name and terminal bracket outcome was
visually verified.

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
