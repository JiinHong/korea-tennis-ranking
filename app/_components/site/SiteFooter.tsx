import ThemeMenu from "../theme/ThemeMenu";

const DATA_INQUIRY_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfmGPqEZ9seYVT4byNnhACUZjS6oNCkuqKq4jbJiJzevFl5jA/viewform";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a
          className="site-footer-inquiry"
          href={DATA_INQUIRY_URL}
          rel="noreferrer"
          target="_blank"
        >
          랭킹 데이터 관련 문의
        </a>
        <div className="site-footer-bottom">
          <p className="site-footer-copyright">
            © 2026 Korea Campus Tennis Ranking
          </p>
          <ThemeMenu />
        </div>
      </div>
    </footer>
  );
}
