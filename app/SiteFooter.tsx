const OPERATOR_URL =
  "https://billowy-nape-057.notion.site/Park-Jin-Hong-3ab70abb9b0980dfba4dd310a3439f3a?source=copy_link";
const DATA_INQUIRY_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfmGPqEZ9seYVT4byNnhACUZjS6oNCkuqKq4jbJiJzevFl5jA/viewform";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-credit">
          <strong>koreatennisranking.com</strong>
          <span> by </span>
          <a href={OPERATOR_URL} rel="noreferrer" target="_blank">
            Jinhong Park
          </a>
        </p>
        <a
          className="site-footer-inquiry"
          href={DATA_INQUIRY_URL}
          rel="noreferrer"
          target="_blank"
        >
          랭킹 데이터 관련 문의
        </a>
        <p className="site-footer-copyright">
          © 2026 Korea Campus Tennis Ranking
        </p>
      </div>
    </footer>
  );
}
