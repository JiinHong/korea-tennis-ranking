import Link from "next/link";

export default function ClubRankingBackLink({
  clubSlug,
  clubTitle,
}: {
  clubSlug: string;
  clubTitle: string;
}) {
  return (
    <Link
      className="national-back-link"
      href={`/${clubSlug}`}
      aria-label={`${clubTitle}으로 돌아가기`}
    >
      <span className="national-back-icon" aria-hidden="true" />
    </Link>
  );
}
