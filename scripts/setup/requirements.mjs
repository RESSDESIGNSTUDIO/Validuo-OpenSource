// The installer runs before `npm install`, so it uses only Node built-ins and syntax that Node 14+
// can parse — that is how it can report an unsupported Node instead of crashing. Older Node
// versions cannot load `.mjs` reliably; the README states Node 24 as the requirement.

export const REQUIRED_NODE_MAJOR = 24;
export const REQUIRED_NPM_MAJOR = 11;

/** @param {string | null | undefined} version */
export function parseMajor(version) {
  const match = /^v?(\d+)\./.exec(version ?? "");
  return match ? Number(match[1]) : null;
}

/**
 * Returns user-facing problems (Polish); an empty list means the toolchain is supported.
 * Mirrors `engines` in the root package.json: node >=24 <25, npm >=11.
 * @param {{ nodeVersion: string | null; npmVersion: string | null }} versions
 * @returns {string[]}
 */
export function checkRequirements({ nodeVersion, npmVersion }) {
  const problems = [];
  if (parseMajor(nodeVersion) !== REQUIRED_NODE_MAJOR) {
    problems.push(`Wymagany jest Node.js ${REQUIRED_NODE_MAJOR} (wykryto: ${nodeVersion ?? "brak"}). Zobacz .nvmrc.`);
  }
  const npmMajor = parseMajor(npmVersion);
  if (npmMajor === null) {
    problems.push(`Nie udało się ustalić wersji npm; wymagany jest npm ${REQUIRED_NPM_MAJOR} lub nowszy.`);
  } else if (npmMajor < REQUIRED_NPM_MAJOR) {
    problems.push(`Wymagany jest npm ${REQUIRED_NPM_MAJOR} lub nowszy (wykryto: ${npmVersion}).`);
  }
  return problems;
}
