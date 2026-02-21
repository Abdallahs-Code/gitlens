import {
  extractTechnologies,
  extractArchitectures,
  extractDatabases,
  extractCiCdTools,
  extractTestingTools,
  extractSeniority,
  extractRoles
} from '@/lib/extractors';
import { githubFetch } from '@/lib/api.server';
import { NextRequest, NextResponse } from 'next/server';

function isRelevantFile(path: string): boolean {
  const lower = path.toLowerCase();
  
  const skipDirs = [
    'node_modules/',
    'vendor/',
    'dist/',
    'build/',
    'target/',
    '.git/',
    '__pycache__/',
    'venv/',
    'env/',
    '.next/',
    '.nuxt/',
    'coverage/',
    '.vscode/',
    '.idea/'
  ];
  
  for (const dir of skipDirs) {
    if (lower.includes(dir)) return false;
  }
  
  return (
    lower.endsWith('package.json') ||
    lower.endsWith('requirements.txt') ||
    lower.endsWith('pyproject.toml') ||
    lower.endsWith('pipfile') ||
    lower.endsWith('pom.xml') ||
    lower.endsWith('build.gradle') ||
    lower.endsWith('cargo.toml') ||
    lower.endsWith('composer.json') ||
    lower.endsWith('go.mod') ||
    lower.includes('readme')
  );
}

async function analyzeRepo(repoFullName: string) {
  const [owner, repo] = repoFullName.split('/');

  const [repoResponse, languagesResponse] = await Promise.all([
    githubFetch(`https://api.github.com/repos/${owner}/${repo}`),
    githubFetch(`https://api.github.com/repos/${owner}/${repo}/languages`)
  ]);

  const repoJson = await repoResponse.json();
  const languagesJson = await languagesResponse.json();
  
  const defaultBranch = repoJson.default_branch;
  const description = repoJson.description || '';

  const treeResponse = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  const treeJson = await treeResponse.json();
  const files = (treeJson.tree as { path: string; type: string; sha: string }[])
    .filter(file => file.type === 'blob' && isRelevantFile(file.path));

  const repoLanguages = new Map<string, number>();
  const repoTech = new Set<string>();
  const repoArch = new Set<string>();
  const repoDb = new Set<string>();
  const repoCiCd = new Set<string>();
  const repoTesting = new Set<string>();

  for (const [lang, bytes] of Object.entries(languagesJson)) {
    repoLanguages.set(lang, bytes as number);
  }

  if (description) {
    for (const tech of extractTechnologies(description)) repoTech.add(tech);
    for (const arch of extractArchitectures(description)) repoArch.add(arch);
    for (const db of extractDatabases(description)) repoDb.add(db);
    for (const ci of extractCiCdTools(description)) repoCiCd.add(ci);
    for (const test of extractTestingTools(description)) repoTesting.add(test);
  }

  const fileContentsPromises = files.map(async (file) => {
    try {
      const contentResponse = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`
      );
      const contentJson = await contentResponse.json();

      if (contentJson.encoding === 'base64' && contentJson.content) {
        return Buffer.from(contentJson.content, 'base64').toString('utf-8');
      }
      return '';
    } catch (error) {
      console.error(`Error fetching ${file.path}:`, error);
      return '';
    }
  });

  const fileContents = await Promise.all(fileContentsPromises);

  for (const fileContent of fileContents) {
    if (!fileContent) continue;
    
    for (const tech of extractTechnologies(fileContent)) repoTech.add(tech);
    for (const arch of extractArchitectures(fileContent)) repoArch.add(arch);
    for (const db of extractDatabases(fileContent)) repoDb.add(db);
    for (const ci of extractCiCdTools(fileContent)) repoCiCd.add(ci);
    for (const test of extractTestingTools(fileContent)) repoTesting.add(test);
  }

  return {
    languages: repoLanguages,
    techs: Array.from(repoTech),
    architectures: Array.from(repoArch),
    databases: Array.from(repoDb),
    ci_cd: Array.from(repoCiCd),
    testing: Array.from(repoTesting),
  };
}

async function fetchAllRepos(username: string) {
  const perPage = 100;
  let page = 1;
  let allRepos: Array<{ full_name: string }> = [];

  while (true) {
    const response = await githubFetch(
      `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}`
    );

    const repos = await response.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      break;
    }

    allRepos.push(...repos);

    if (repos.length < perPage) {
      break;
    }

    page++;
  }

  return allRepos;
}

export async function analyzeProfile(username: string) {
  const userResponse = await githubFetch(
    `https://api.github.com/users/${username}`
  );

  const userJson = await userResponse.json();
  const repos = await fetchAllRepos(username);

  const bio = userJson.bio || '';
  const company = userJson.company || '';
  const combinedProfileText = `${bio} ${company}`;

  const SENIORITY_PRIORITY = [
    'Principal',
    'Staff',
    'Lead',
    'Senior',
    'Mid',
    'Junior',
  ] as const;

  const detectedSeniority = extractSeniority(combinedProfileText);

  let finalSeniority = 'Unknown';
  for (const level of SENIORITY_PRIORITY) {
    if (detectedSeniority.includes(level)) {
      finalSeniority = level;
      break;
    }
  }
  
  const roles = extractRoles(combinedProfileText);
  const profileLanguages = new Map<string, number>();
  const profileTech = new Map<string, number>();
  const profileArch = new Map<string, number>();
  const profileDb = new Map<string, number>();
  const profileCiCd = new Map<string, number>();
  const profileTesting = new Map<string, number>();

  const CONCURRENCY = 5; 
  const repoResults = [];
  
  for (let i = 0; i < repos.length; i += CONCURRENCY) {
    const batch = repos.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(repo => analyzeRepo(repo.full_name))
    );
    repoResults.push(...batchResults);
  }

  for (const result of repoResults) {
    if (result.status === 'fulfilled') {
      const { techs, architectures, databases, ci_cd, testing, languages } = result.value;
      
      for (const [lang, bytes] of languages) {
        profileLanguages.set(lang, (profileLanguages.get(lang) || 0) + bytes);
      }

      for (const tech of techs) {
        profileTech.set(tech, (profileTech.get(tech) || 0) + 1);
      }

      for (const arch of architectures) {
        profileArch.set(arch, (profileArch.get(arch) || 0) + 1);
      }

      for (const db of databases) {
        profileDb.set(db, (profileDb.get(db) || 0) + 1);
      }

      for (const ci of ci_cd) {
        profileCiCd.set(ci, (profileCiCd.get(ci) || 0) + 1);
      }

      for (const test of testing) {
        profileTesting.set(test, (profileTesting.get(test) || 0) + 1);
      }
    }
  }

  const sortMap = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

  const result: Record<string, any> = { profile: username };

  if (finalSeniority !== 'Unknown') result.seniority = finalSeniority;
  if (roles.length) result.roles = roles;

  const sortedLanguages = sortMap(profileLanguages);
  const sortedTech = sortMap(profileTech);
  const sortedArch = sortMap(profileArch);
  const sortedDatabases = sortMap(profileDb);
  const sortedCiCd = sortMap(profileCiCd);
  const sortedTesting = sortMap(profileTesting);

  if (sortedLanguages.length) result.languages = sortedLanguages;
  if (sortedTech.length) result.tech = sortedTech;
  if (sortedArch.length) result.architecture = sortedArch;
  if (sortedDatabases.length) result.databases = sortedDatabases;
  if (sortedCiCd.length) result.ci_cd = sortedCiCd;
  if (sortedTesting.length) result.testing = sortedTesting;

  return result;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid username in route' },
        { status: 400 }
      );
    }

    const result = await analyzeProfile(username);

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error analyzing GitHub profile:', error);

    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}