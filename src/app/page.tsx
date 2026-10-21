import Backdrop from "./backdrop";

export default function Home() {
  return (
    <div className="starter">
      <Backdrop />
      <main>
        <svg className="framework-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8.4 16.4V7.9l8 10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 7.9v5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="status">
          <span className="status-dot" aria-hidden="true" />
          Running
        </p>
        <h1>Your Next.js app is ready.</h1>
        <p className="lede">
          Describe what you want in the AI Coding Agent tab, and this page turns into it.
        </p>
        <p className="aside">
          Prefer to write the code yourself? Start in <code>src/app/page.tsx</code>.
        </p>
      </main>
      <ul className="stack" aria-label="What this workspace runs">
        <li>Next.js</li>
        <li>React</li>
        <li>TypeScript</li>
        <li>App Router</li>
        <li>Fast refresh</li>
        <li>Port 3000</li>
      </ul>
    </div>
  );
}
