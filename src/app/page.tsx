import { EnrollmentForm } from "@/components/EnrollmentForm";

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/styles.css" />
      <header className="site-header" id="top">
        <div className="header-inner">
          <a href="#top" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Niksmarvel Fashion Academy" width={160} height={60} />
          </a>
          <nav className="site-nav" id="siteNav" aria-label="Primary">
            <a href="#enroll">Enroll</a>
            <a href="#contact">Contact</a>
          </nav>
          <button
            type="button"
            className="menu-toggle"
            id="menuToggle"
            aria-expanded="false"
            aria-controls="siteNav"
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main className="form-page" id="enroll">
        <div className="form-intro">
          <p className="eyebrow">Student Enrollment</p>
          <h1>Niksmarvel Fashion Academy</h1>
          <p className="lede">
            Complete the form below to apply for a place on one of our fashion programmes.
            All fields marked with an asterisk are required.
          </p>
        </div>

        <EnrollmentForm />
      </main>

      <footer className="site-footer" id="contact">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} Niksmarvel Fashion Academy</p>
        </div>
      </footer>
    </>
  );
}
